'use client';

import { useEffect, useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { PageHeader, PageWrapper } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CombatLog {
  id: number;
  citizenid: string | null;
  victim_name: string | null;
  attacker_citizenid: string | null;
  attacker_name: string | null;
  weapon: string | null;
  event_type: string;
  location: string | null;
  occurred_at: string;
}

export default function CombatLogsPage() {
  const { canViewCombatLogs, loading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<CombatLog[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!loading && !canViewCombatLogs) {
      router.replace('/dashboard');
    }
  }, [loading, canViewCombatLogs, router]);

  useEffect(() => {
    if (!canViewCombatLogs) return;
    api.adminCombatLogs({ limit: 50, offset }).then((d) => {
      setLogs(d.logs || []);
      setTotal(d.total || 0);
    }).catch(console.error);
  }, [canViewCombatLogs, offset]);

  if (loading || !canViewCombatLogs) {
    return <div className="flex items-center justify-center h-64 text-noxus-muted animate-pulse">Loading...</div>;
  }

  const filtered = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [log.victim_name, log.attacker_name, log.weapon, log.citizenid, log.attacker_citizenid, log.location]
      .some((v) => String(v || '').toLowerCase().includes(q));
  });

  return (
    <PageWrapper>
      <PageHeader
        title="Combat Logs"
        description="Restricted combat incident review for owner and developer roles"
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative max-w-sm flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-noxus-muted" />
          <Input
            placeholder="Search victim, attacker, weapon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="self-center">{total} total records</Badge>
      </div>

      <Card className="noxus-card-glow">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-noxus-muted">
              No combat logs recorded yet. Connect a FiveM combat logging resource to populate this view.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-noxus-muted border-b border-noxus-border bg-noxus-surface/50">
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Victim</th>
                  <th className="px-5 py-3">Attacker</th>
                  <th className="px-5 py-3">Weapon</th>
                  <th className="px-5 py-3">Location</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-noxus-border/50 hover:bg-white/5">
                    <td className="px-5 py-3 text-noxus-muted">{new Date(log.occurred_at).toLocaleString()}</td>
                    <td className="px-5 py-3"><Badge variant="outline">{log.event_type}</Badge></td>
                    <td className="px-5 py-3">{log.victim_name || log.citizenid || '—'}</td>
                    <td className="px-5 py-3">{log.attacker_name || log.attacker_citizenid || '—'}</td>
                    <td className="px-5 py-3">{log.weapon || '—'}</td>
                    <td className="px-5 py-3 text-noxus-muted">{log.location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center gap-2 mt-4">
        <Button variant="ghost" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous</Button>
        <Button variant="ghost" size="sm" disabled={offset + 50 >= total} onClick={() => setOffset(offset + 50)}>Next</Button>
      </div>
    </PageWrapper>
  );
}
