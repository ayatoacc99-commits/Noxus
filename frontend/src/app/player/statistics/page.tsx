'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PlayerPageHeader, PlayerStatCard } from '@/components/player/PlayerComponents';
import { PageTransition } from '@/components/layout/PageTransition';

export default function PlayerStatisticsPage() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    api.playerStatistics().then((d) => setStats(d.statistics)).catch(console.error);
  }, []);

  if (!stats) return <p className="text-noxus-muted animate-pulse">Loading...</p>;

  return (
    <PageTransition>
      <PlayerPageHeader title="Statistics" description="Your lifetime performance" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { label: 'Hours Played', value: stats.hoursPlayed },
          { label: 'Arrests', value: stats.arrests },
          { label: 'Deaths', value: stats.deaths },
          { label: 'Kills', value: stats.kills },
          { label: 'Jobs Completed', value: stats.jobsCompleted },
          { label: 'Vehicles Owned', value: stats.vehiclesOwned },
          { label: 'Houses Owned', value: stats.housesOwned },
        ].map((s, i) => (
          <PlayerStatCard key={s.label} label={s.label} value={s.value ?? 0} delay={i * 0.05} />
        ))}
      </div>
    </PageTransition>
  );
}
