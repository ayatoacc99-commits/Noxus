'use client';

import { useEffect, useState } from 'react';
import { api, LeaderboardType } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { PlayerPageHeader } from '@/components/player/PlayerComponents';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/layout/PageTransition';

const BOARDS: { id: LeaderboardType; label: string }[] = [
  { id: 'richest', label: 'Richest Players' },
  { id: 'hours', label: 'Most Hours' },
  { id: 'vehicles', label: 'Most Vehicles' },
  { id: 'houses', label: 'Most Houses' },
  { id: 'job_level', label: 'Highest Job Level' },
  { id: 'jobs_completed', label: 'Most Jobs Completed' },
  { id: 'business', label: 'Business Rankings' },
  { id: 'gang_territory', label: 'Gang Territory' },
];

function formatBoardValue(type: LeaderboardType, entry: Record<string, unknown>) {
  switch (type) {
    case 'richest':
      return formatMoney(entry.total as number);
    case 'hours':
      return `${entry.hours || entry.value || 0}h`;
    case 'vehicles':
      return `${entry.vehicles || entry.value || 0} vehicles`;
    case 'houses':
      return `${entry.houses || entry.value || 0} houses`;
    case 'job_level':
      return `Level ${entry.jobLevel || entry.value || 0}`;
    case 'jobs_completed':
      return `${entry.jobsCompleted || entry.value || 0} jobs`;
    case 'business':
      return `${entry.businessActivity || entry.value || 0} activity`;
    case 'gang_territory':
      return `${entry.territories || entry.value || 0} territories · ${entry.members || 0} members`;
    default:
      return String(entry.value ?? '—');
  }
}

export default function PlayerLeaderboardsPage() {
  const [type, setType] = useState<LeaderboardType>('richest');
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<Record<string, unknown>[]>([]);
  const [offset, setOffset] = useState(0);

  const load = (t = type, o = offset) => {
    api.playerLeaderboards(t, 25, o).then((d) => setEntries(d.entries || [])).catch(console.error);
  };

  useEffect(() => { load(); }, [type, offset]);

  const filtered = entries.filter((e) => {
    if (!search) return true;
    return String(e.name).toLowerCase().includes(search.toLowerCase());
  });

  const isGangBoard = type === 'gang_territory';

  return (
    <PageTransition>
      <PlayerPageHeader title="Leaderboards" description="Roleplay, economy, and progression rankings" />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <div className="flex flex-wrap gap-2">
          {BOARDS.map((b) => (
            <Button key={b.id} variant={type === b.id ? 'default' : 'ghost'} size="sm" onClick={() => { setType(b.id); setOffset(0); }}>
              {b.label}
            </Button>
          ))}
        </div>
      </div>

      <Card className="noxus-card-glow">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-noxus-muted border-b border-noxus-border bg-noxus-surface/50">
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">{isGangBoard ? 'Gang' : 'Player'}</th>
                {!isGangBoard && <th className="px-5 py-3">Job</th>}
                <th className="px-5 py-3">Value</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={String(e.citizenid || e.gang || e.name)} className="border-b border-noxus-border/50 hover:bg-white/5">
                  <td className="px-5 py-3"><Badge variant="outline">#{String(e.rank)}</Badge></td>
                  <td className="px-5 py-3 font-medium">{String(e.name)}</td>
                  {!isGangBoard && <td className="px-5 py-3 text-noxus-muted">{String(e.job || '—')}</td>}
                  <td className="px-5 py-3 text-noxus-success font-medium">
                    {formatBoardValue(type, e)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-2 mt-4">
        <Button variant="ghost" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 25))}>Previous</Button>
        <Button variant="ghost" size="sm" onClick={() => setOffset(offset + 25)}>Next</Button>
      </div>
    </PageTransition>
  );
}
