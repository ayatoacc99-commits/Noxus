'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { PlayerPageHeader, PlayerStatCard } from '@/components/player/PlayerComponents';
import { PageTransition } from '@/components/layout/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type RpStats = {
  hoursPlayed?: number;
  jobsCompleted?: number;
  legalJobLevel?: number;
  legalJobName?: string;
  vehiclesOwned?: number;
  housesOwned?: number;
  businessActivity?: number;
  economyRank?: number | null;
  drivingDistance?: number;
  craftingLevel?: number;
  reputation?: number;
  communityScore?: number | null;
  cash?: number;
  bank?: number;
};

export default function PlayerStatisticsPage() {
  const [stats, setStats] = useState<RpStats | null>(null);

  useEffect(() => {
    api.playerStatistics().then((d) => setStats(d.statistics)).catch(console.error);
  }, []);

  if (!stats) return <p className="text-noxus-muted animate-pulse">Loading...</p>;

  const progressStats = [
    { label: 'Hours Played', value: stats.hoursPlayed },
    { label: 'Jobs Completed', value: stats.jobsCompleted },
    { label: 'Vehicles Owned', value: stats.vehiclesOwned },
    { label: 'Houses Owned', value: stats.housesOwned },
    { label: 'Economy Rank', value: stats.economyRank ? `#${stats.economyRank}` : '—' },
    { label: 'Crafting Level', value: stats.craftingLevel },
    { label: 'Reputation', value: stats.reputation },
  ];

  const extendedStats = [
    { label: 'Legal Job Level', value: stats.legalJobLevel },
    { label: 'Legal Job', value: stats.legalJobName || '—' },
    { label: 'Business Activity', value: stats.businessActivity },
    { label: 'Driving Distance', value: stats.drivingDistance ? `${stats.drivingDistance} km` : 0 },
    { label: 'Community Score', value: stats.communityScore ?? '—' },
    { label: 'Cash', value: formatMoney(stats.cash) },
    { label: 'Bank', value: formatMoney(stats.bank) },
  ];

  return (
    <PageTransition>
      <PlayerPageHeader title="Statistics" description="Your roleplay progression and achievements" />

      <Card className="mb-6 noxus-card-glow">
        <CardHeader>
          <CardTitle>Roleplay Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {progressStats.map((s, i) => (
              <PlayerStatCard key={s.label} label={s.label} value={s.value ?? 0} delay={i * 0.05} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {extendedStats.map((s, i) => (
          <PlayerStatCard key={s.label} label={s.label} value={s.value ?? 0} delay={i * 0.05} />
        ))}
      </div>
    </PageTransition>
  );
}
