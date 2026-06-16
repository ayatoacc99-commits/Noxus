'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PlayerPageHeader, PlayerStatCard } from '@/components/player/PlayerComponents';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/layout/PageTransition';

export default function PlayerVehiclesPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.playerVehicles().then(setData).catch(console.error);
  }, []);

  const vehicles = (data?.vehicles as Record<string, unknown>[]) || [];
  const stats = data?.stats as Record<string, unknown>;

  return (
    <PageTransition>
      <PlayerPageHeader title="My Vehicles" description="Your garage across Los Santos" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <PlayerStatCard label="Total Vehicles" value={String(stats?.total || 0)} delay={0} />
        <PlayerStatCard label="Garage Value" value={`$${Number(stats?.totalValue || 0).toLocaleString()}`} delay={0.05} />
        <PlayerStatCard label="Most Expensive" value={(stats?.mostExpensive as { vehicle?: string })?.vehicle || '—'} delay={0.1} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {vehicles.map((v, i) => (
          <Card key={i} className="noxus-card-glow hover:shadow-glow transition-all">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold">{String(v.vehicle || v.model || 'Vehicle')}</h3>
                <Badge variant="outline" className="font-mono text-xs">{String(v.plate || '—')}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-noxus-text-secondary">
                <span>Garage: {String(v.garage || '—')}</span>
                <span>State: {v.state === 1 ? 'Stored' : 'Out'}</span>
                <span>Fuel: {String(v.fuel ?? 100)}%</span>
                <span>Engine: {String(v.engine ?? 1000)}</span>
                <span>Body: {String(v.body ?? 1000)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {vehicles.length === 0 && <p className="text-noxus-muted col-span-full text-center py-12">No vehicles owned</p>}
      </div>
    </PageTransition>
  );
}
