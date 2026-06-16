'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { PlayerPageHeader } from '@/components/player/PlayerComponents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PageTransition } from '@/components/layout/PageTransition';

export default function PlayerProfilePage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.playerProfile().then(setData).catch(console.error);
  }, []);

  if (!data?.linked) {
    return <p className="text-noxus-muted p-6">No character linked</p>;
  }

  const player = data.player as Record<string, Record<string, unknown>>;
  const achievements = (data.achievements as { id: string; title: string; progress: number; current: number; target: number }[]) || [];

  return (
    <PageTransition>
      <PlayerPageHeader title="Character Profile" description="Your identity in Noxus RP" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="noxus-card-glow bg-gradient-to-br from-noxus-card to-noxus-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-5 mb-6">
              <Avatar className="h-20 w-20 ring-4 ring-noxus-primary/30">
                <AvatarFallback className="text-2xl">{String(player.name).slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{String(player.name)}</h2>
                <p className="font-mono text-noxus-primary text-sm">{String(player.citizenid)}</p>
                <p className="text-xs text-noxus-muted mt-1">Phone: {(player.charinfo as { phone?: string })?.phone || '—'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Cash" value={formatMoney((player.money as { cash?: number })?.cash)} />
              <Stat label="Bank" value={formatMoney((player.money as { bank?: number })?.bank)} />
              <Stat label="Job" value={(player.job as { label?: string })?.label || '—'} />
              <Stat label="Gang" value={(player.gang as { label?: string })?.label || 'None'} />
            </div>
          </CardContent>
        </Card>

        <Card className="noxus-card-glow">
          <CardHeader><CardTitle>Achievements</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {achievements.length === 0 ? (
              <p className="text-noxus-muted text-sm">Play more to unlock achievements</p>
            ) : (
              achievements.map((a) => (
                <div key={a.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{a.title}</span>
                    <span className="text-noxus-muted">{a.current}/{a.target}</span>
                  </div>
                  <Progress value={a.progress} indicatorClassName="bg-gradient-to-r from-noxus-primary to-noxus-secondary" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-noxus-surface/50 border border-noxus-border">
      <p className="text-xs text-noxus-muted">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
