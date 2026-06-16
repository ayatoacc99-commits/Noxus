'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, PageWrapper } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

export default function LiveMonitorPage() {
  const { canEdit } = useAuth();
  const [players, setPlayers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.liveMonitor().then((d) => setPlayers(d.players || [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action: string, target: string) => {
    if (!canEdit) return;
    try {
      if (action === 'give-money') {
        const amount = prompt('Amount:');
        if (!amount) return;
        const citizenid = players.find((p) => p.name === target || p.characterName === target)?.citizenid;
        if (citizenid) await api.monitorGiveMoney(String(citizenid), Number(amount));
      } else if (action === 'kick') {
        await api.monitorAction('kick', target, { reason: 'Kicked from panel' });
      } else {
        await api.monitorAction(action, target);
      }
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <PageWrapper>
      <PageHeader title="Live Player Monitor" description={`${players.length} players online`} actions={<Button onClick={load}>Refresh</Button>} />

      {loading ? (
        <p className="text-noxus-muted animate-pulse">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {players.map((p, i) => (
            <Card key={i} className="noxus-card-glow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarFallback>{String(p.characterName || p.name).slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{String(p.characterName || p.name)}</h3>
                      <Badge variant="outline" className="text-[10px]">{String(p.ping)}ms</Badge>
                    </div>
                    <p className="text-xs font-mono text-noxus-primary">{String(p.citizenid || '—')}</p>
                    <p className="text-xs text-noxus-muted mt-1">{String(p.job || '—')} · {String(p.gang || 'No gang')}</p>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button size="sm" variant="ghost" onClick={() => handleAction('kick', String(p.serverId || p.name))}>Kick</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleAction('freeze', String(p.serverId))}>Freeze</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleAction('give-money', String(p.characterName))}>Give Money</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {players.length === 0 && <p className="text-noxus-muted col-span-full text-center py-12">No players online or RCON unavailable</p>}
        </div>
      )}
    </PageWrapper>
  );
}
