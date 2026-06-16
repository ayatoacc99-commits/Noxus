'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Ban, Save } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function PlayerDetailPage() {
  const { citizenid } = useParams<{ citizenid: string }>();
  const { canEdit } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [cash, setCash] = useState(0);
  const [bank, setBank] = useState(0);
  const [jobName, setJobName] = useState('');
  const [jobGrade, setJobGrade] = useState(0);

  useEffect(() => {
    if (!citizenid) return;
    api.getPlayer(citizenid).then((d) => {
      if (!d.installed) return;
      if (!d.player) { router.push('/players'); return; }
      setData(d);
      setCash(d.player.money?.cash || 0);
      setBank(d.player.money?.bank || 0);
      setJobName(d.player.job?.name || '');
      setJobGrade(d.player.job?.grade?.level || 0);
    });
  }, [citizenid, router]);

  if (!data?.player) {
    return <p className="text-noxus-muted">Loading...</p>;
  }

  const player = data.player as {
    license?: string;
    charinfo?: { firstname?: string; lastname?: string; phone?: string; discord?: string };
    money?: { cash?: number; bank?: number };
    job?: { name?: string; grade?: { level?: number } };
    metadata?: Record<string, unknown>;
    lastUpdated?: string;
  };

  const save = async () => {
    await api.updatePlayer(citizenid, {
      money: { cash, bank },
      job: { name: jobName, grade: jobGrade },
    });
    alert('Saved successfully');
  };

  const ban = async () => {
    const reason = prompt('Ban reason:');
    if (!reason) return;
    await api.banPlayer(citizenid, reason);
    alert('Player banned');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/players" className="btn-ghost !p-2"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="text-2xl font-bold">{player.charinfo?.firstname} {player.charinfo?.lastname}</h1>
          <p className="text-noxus-muted font-mono">{citizenid}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="font-semibold">Profile</h2>
          <InfoRow label="License" value={player.license} />
          <InfoRow label="Phone" value={player.charinfo?.phone} />
          <InfoRow label="Discord" value={player.charinfo?.discord} />
          <InfoRow label="Last Updated" value={player.lastUpdated} />
        </div>

        {canEdit && (
          <div className="card space-y-4">
            <h2 className="font-semibold">Edit</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-noxus-muted">Cash</label>
                <input type="number" className="input" value={cash} onChange={(e) => setCash(+e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-noxus-muted">Bank</label>
                <input type="number" className="input" value={bank} onChange={(e) => setBank(+e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-noxus-muted">Job</label>
                <input className="input" value={jobName} onChange={(e) => setJobName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-noxus-muted">Grade</label>
                <input type="number" className="input" value={jobGrade} onChange={(e) => setJobGrade(+e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={save}><Save className="w-4 h-4" /> Save</button>
              <button className="btn-danger" onClick={ban}><Ban className="w-4 h-4" /> Ban</button>
            </div>
          </div>
        )}

        <div className="card">
          <h2 className="font-semibold mb-3">Metadata</h2>
          <pre className="text-xs overflow-auto max-h-48 text-noxus-muted">{JSON.stringify(player.metadata, null, 2)}</pre>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-3">Vehicles</h2>
          {(data.vehicles as { installed: boolean; vehicles: unknown[] })?.installed === false ? (
            <p className="text-noxus-muted">Not installed</p>
          ) : (
            <pre className="text-xs overflow-auto max-h-48">{JSON.stringify((data.vehicles as { vehicles: unknown[] })?.vehicles, null, 2)}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-noxus-muted">{label}</span>
      <span>{value || '—'}</span>
    </div>
  );
}
