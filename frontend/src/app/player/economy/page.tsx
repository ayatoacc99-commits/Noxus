'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { PlayerPageHeader, PlayerStatCard } from '@/components/player/PlayerComponents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricChart } from '@/components/charts/MetricCharts';
import { PageTransition } from '@/components/layout/PageTransition';

export default function PlayerEconomyPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.playerEconomy().then(setData).catch(console.error);
  }, []);

  const overview = data?.overview as Record<string, unknown>;
  const history = (data?.history as { time: string; circulation: number }[]) || [];
  const chartData = history.map((h) => ({ time: new Date(h.time).toLocaleDateString(), value: h.circulation }));

  if (!overview?.installed) {
    return <p className="text-noxus-muted p-6">Economy data not available</p>;
  }

  return (
    <PageTransition>
      <PlayerPageHeader title="Server Economy" description="Read-only economy analytics" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <PlayerStatCard label="Total Cash" value={formatMoney(overview.totalCash as number)} delay={0} />
        <PlayerStatCard label="Total Bank" value={formatMoney(overview.totalBank as number)} delay={0.05} />
        <PlayerStatCard label="In Circulation" value={formatMoney(overview.totalCirculation as number)} delay={0.1} color="text-noxus-secondary" />
      </div>

      <Card className="mb-6 noxus-card-glow">
        <CardHeader><CardTitle>Money Circulation</CardTitle></CardHeader>
        <CardContent>
          <MetricChart data={chartData} color="#6D5DFE" unit="" label="Economy" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="noxus-card-glow">
          <CardHeader><CardTitle>Top Richest Players</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {((overview.richestPlayers as { rank: number; name: string; total: number }[]) || []).map((p) => (
              <div key={p.rank} className="flex justify-between py-2 border-b border-noxus-border/50 text-sm">
                <span><span className="text-noxus-primary mr-2">#{p.rank}</span>{p.name}</span>
                <span className="text-noxus-success font-medium">{formatMoney(p.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="noxus-card-glow">
          <CardHeader><CardTitle>Top Richest Gangs</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {((overview.richestGangs as { rank: number; name: string; wealth: number }[]) || []).map((g) => (
              <div key={g.rank} className="flex justify-between py-2 border-b border-noxus-border/50 text-sm">
                <span><span className="text-noxus-primary mr-2">#{g.rank}</span>{g.name}</span>
                <span className="text-noxus-warning font-medium">{formatMoney(g.wealth)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
