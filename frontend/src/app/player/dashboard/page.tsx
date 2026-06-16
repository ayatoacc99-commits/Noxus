'use client';

import { useEffect, useState } from 'react';
import {
  UserIcon,
  BanknotesIcon,
  ClockIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { PlayerPageHeader, PlayerStatCard } from '@/components/player/PlayerComponents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PageTransition } from '@/components/layout/PageTransition';

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

export default function PlayerDashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.playerDashboard().then(setData).catch(console.error);
  }, []);

  if (!data) {
    return <div className="text-noxus-muted animate-pulse p-8">Loading your character...</div>;
  }

  if (!data.linked) {
    return (
      <PageTransition>
        <PlayerPageHeader title="Welcome to Noxus" description="Link your Discord to view your character" />
        <Card className="border-noxus-warning/30 bg-noxus-warning/5">
          <CardContent className="p-8 text-center">
            <p className="text-noxus-warning">{data.message as string}</p>
          </CardContent>
        </Card>
      </PageTransition>
    );
  }

  const character = data.character as Record<string, Record<string, unknown>>;
  const stats = data.statistics as RpStats;
  const server = data.server as Record<string, unknown>;

  return (
    <PageTransition>
      <PlayerPageHeader title={`Welcome, ${String(character.name)}`} description="Your Noxus RP character overview" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        <Card className="xl:col-span-1 noxus-card-glow border-noxus-primary/20 bg-noxus-card/80 backdrop-blur">
          <CardHeader><CardTitle className="text-sm text-noxus-muted">Character</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-noxus-primary/40">
                <AvatarFallback className="text-xl bg-noxus-primary/20 text-noxus-primary">
                  {String(character.name || '?').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold">{String(character.name)}</h2>
                <p className="text-xs font-mono text-noxus-primary">{String(character.citizenid)}</p>
                <Badge variant="outline" className="mt-1 text-[10px]">ID: {String(character.permanentId || '—')}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Info label="Job" value={`${(character.job as { label?: string })?.label || '—'}`} />
              <Info label="Gang" value={`${(character.gang as { label?: string })?.label || 'None'}`} />
              <Info label="Cash" value={formatMoney((character.money as { cash?: number })?.cash)} />
              <Info label="Bank" value={formatMoney((character.money as { bank?: number })?.bank)} />
            </div>
          </CardContent>
        </Card>

        <div className="xl:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <PlayerStatCard label="Hours Played" value={stats?.hoursPlayed || 0} icon={ClockIcon} delay={0.05} />
          <PlayerStatCard label="Vehicles" value={stats?.vehiclesOwned || 0} icon={ServerStackIcon} color="text-noxus-secondary" delay={0.1} />
          <PlayerStatCard label="Properties" value={stats?.housesOwned || 0} icon={UserIcon} color="text-noxus-success" delay={0.15} />
          <PlayerStatCard label="Total Money" value={formatMoney((stats?.cash || 0) + (stats?.bank || 0))} icon={BanknotesIcon} color="text-noxus-warning" delay={0.2} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="noxus-card-glow bg-noxus-card/80 backdrop-blur">
          <CardHeader><CardTitle>Server Status</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Online Players" value={String(server.onlinePlayers)} />
            <Info label="Registered" value={String(server.totalPlayers)} />
            <Info label="Total Vehicles" value={String(server.totalVehicles)} />
            <Info label="Total Houses" value={String(server.totalHouses)} />
            <Info label="Uptime" value={String(server.uptime)} />
            <Info label="Status" value={server.online ? 'ONLINE' : 'OFFLINE'} />
          </CardContent>
        </Card>

        <Card className="noxus-card-glow bg-noxus-card/80 backdrop-blur">
          <CardHeader><CardTitle>Roleplay Progress</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Hours Played" value={String(stats?.hoursPlayed || 0)} />
            <Info label="Jobs Completed" value={String(stats?.jobsCompleted || 0)} />
            <Info label="Vehicles Owned" value={String(stats?.vehiclesOwned || 0)} />
            <Info label="Houses Owned" value={String(stats?.housesOwned || 0)} />
            <Info label="Economy Rank" value={stats?.economyRank ? `#${stats.economyRank}` : '—'} />
            <Info label="Crafting Level" value={String(stats?.craftingLevel || 0)} />
            <Info label="Reputation" value={String(stats?.reputation || 0)} />
            <Info label="Legal Job Level" value={String(stats?.legalJobLevel || 0)} />
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-noxus-muted text-xs">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
