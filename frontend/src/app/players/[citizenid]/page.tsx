'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  NoSymbolIcon,
  BanknotesIcon,
  BriefcaseIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatMoney } from '@/lib/utils';
import { PageWrapper } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FadeIn } from '@/components/layout/PageTransition';

export default function PlayerDetailPage() {
  const { citizenid } = useParams<{ citizenid: string }>();
  const { canEdit, canViewCombatLogs } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [cash, setCash] = useState(0);
  const [bank, setBank] = useState(0);
  const [jobName, setJobName] = useState('');
  const [jobGrade, setJobGrade] = useState(0);
  const [gangName, setGangName] = useState('');
  const [note, setNote] = useState('');

  const load = () => {
    if (!citizenid) return;
    api.getPlayer(citizenid).then((d) => {
      if (!d.installed) return;
      if (!d.player) { router.push('/players'); return; }
      setData(d);
      setCash(d.player.money?.cash || 0);
      setBank(d.player.money?.bank || 0);
      setJobName(d.player.job?.name || '');
      setJobGrade(d.player.job?.grade?.level || 0);
      setGangName(d.player.gang?.name || '');
    });
  };

  useEffect(() => { load(); }, [citizenid, router]);

  if (!data?.player) {
    return <div className="flex items-center justify-center h-64 text-noxus-muted animate-pulse">Loading profile...</div>;
  }

  const player = data.player as {
    license?: string;
    charinfo?: { firstname?: string; lastname?: string; phone?: string; discord?: string };
    money?: { cash?: number; bank?: number };
    job?: { name?: string; label?: string; grade?: { level?: number } };
    gang?: { name?: string; label?: string };
    metadata?: Record<string, unknown>;
    lastUpdated?: string;
  };

  const save = async () => {
    await api.updatePlayer(citizenid, {
      money: { cash, bank },
      job: { name: jobName, grade: jobGrade },
      gang: { name: gangName },
    });
    load();
  };

  const ban = async () => {
    const reason = prompt('Ban reason:');
    if (!reason) return;
    await api.banPlayer(citizenid, reason);
    alert('Player banned');
  };

  const addNote = async () => {
    if (!note.trim()) return;
    await api.addNote(citizenid, note);
    setNote('');
    load();
  };

  return (
    <PageWrapper>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/players"><Button variant="ghost" size="icon"><ArrowLeftIcon className="w-4 h-4" /></Button></Link>
        <Avatar className="h-14 w-14">
          <AvatarFallback className="text-xl bg-noxus-primary/20 text-noxus-primary">
            {player.charinfo?.firstname?.[0]}{player.charinfo?.lastname?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{player.charinfo?.firstname} {player.charinfo?.lastname}</h1>
          <p className="text-noxus-primary font-mono text-sm">{citizenid}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button onClick={save}>Save Changes</Button>
            <Button variant="danger" onClick={ban}><NoSymbolIcon className="w-4 h-4" /> Ban</Button>
          </div>
        )}
      </div>

      {/* Profile cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <FadeIn>
          <Card className="noxus-card-glow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-noxus-success/20"><BanknotesIcon className="w-6 h-6 text-noxus-success" /></div>
              <div>
                <p className="text-xs text-noxus-muted">Total Money</p>
                <p className="text-xl font-bold">{formatMoney((cash || 0) + (bank || 0))}</p>
                <p className="text-xs text-noxus-muted">Cash {formatMoney(cash)} · Bank {formatMoney(bank)}</p>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.05}>
          <Card className="noxus-card-glow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-noxus-primary/20"><BriefcaseIcon className="w-6 h-6 text-noxus-primary" /></div>
              <div>
                <p className="text-xs text-noxus-muted">Job</p>
                <p className="text-xl font-bold">{player.job?.label || jobName || 'Unemployed'}</p>
                <p className="text-xs text-noxus-muted">Grade {jobGrade}</p>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.1}>
          <Card className="noxus-card-glow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-noxus-danger/20"><UserGroupIcon className="w-6 h-6 text-noxus-danger" /></div>
              <div>
                <p className="text-xs text-noxus-muted">Gang</p>
                <p className="text-xl font-bold">{player.gang?.label || gangName || 'None'}</p>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="bans">Ban History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Character Info</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="License" value={player.license} mono />
                <InfoRow label="Phone" value={player.charinfo?.phone} />
                <InfoRow label="Discord" value={player.charinfo?.discord} />
                <InfoRow label="Last Updated" value={player.lastUpdated} />
              </CardContent>
            </Card>

            {canEdit && (
              <Card>
                <CardHeader><CardTitle>Edit Character</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cash" type="number" value={cash} onChange={(v) => setCash(Number(v))} />
                    <Field label="Bank" type="number" value={bank} onChange={(v) => setBank(Number(v))} />
                    <Field label="Job" value={jobName} onChange={(v) => setJobName(String(v))} />
                    <Field label="Grade" type="number" value={jobGrade} onChange={(v) => setJobGrade(Number(v))} />
                    <Field label="Gang" value={gangName} onChange={(v) => setGangName(String(v))} className="col-span-2" />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
                {!canViewCombatLogs && (
                  <p className="text-xs text-noxus-muted">Combat-related fields are hidden from this view.</p>
                )}
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono bg-black/30 rounded-lg p-4 overflow-auto max-h-64 text-noxus-text-secondary">
                  {JSON.stringify(player.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vehicles">
          <Card>
            <CardContent className="p-5">
              {(data.vehicles as { installed: boolean })?.installed === false ? (
                <p className="text-noxus-muted">Not installed</p>
              ) : (
                <pre className="text-xs font-mono overflow-auto">{JSON.stringify((data.vehicles as { vehicles: unknown[] })?.vehicles, null, 2)}</pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardContent className="p-5">
              {(data.inventory as { installed: boolean })?.installed === false ? (
                <p className="text-noxus-muted">Not installed</p>
              ) : (
                <pre className="text-xs font-mono overflow-auto">{JSON.stringify((data.inventory as { inventory: unknown[] })?.inventory, null, 2)}</pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="p-5 space-y-4">
              {canEdit && (
                <div className="flex gap-2">
                  <Input placeholder="Add admin note..." value={note} onChange={(e) => setNote(e.target.value)} />
                  <Button onClick={addNote}>Add</Button>
                </div>
              )}
              <div className="space-y-2">
                {((data.notes as { note: string; author: string; created_at: string }[]) || []).map((n, i) => (
                  <div key={i} className="p-3 rounded-lg bg-noxus-surface border border-noxus-border">
                    <p className="text-sm">{n.note}</p>
                    <p className="text-xs text-noxus-muted mt-1">{n.author} · {new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))}
                {!(data.notes as unknown[])?.length && <p className="text-noxus-muted text-sm">No notes yet</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bans">
          <Card>
            <CardContent className="p-5">
              <p className="text-noxus-muted text-sm">
                {(data.tables as Record<string, boolean>)?.bans
                  ? 'Ban records are stored in the QB-Core bans table. Use the Ban button to add new bans.'
                  : 'Bans table: Not installed'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-noxus-border/50 last:border-0">
      <span className="text-noxus-muted">{label}</span>
      <span className={mono ? 'font-mono text-xs' : ''}>{value || '—'}</span>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', className }: {
  label: string;
  value: string | number;
  onChange: (v: string | number) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs text-noxus-muted mb-1 block">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      />
    </div>
  );
}
