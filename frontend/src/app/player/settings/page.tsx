'use client';

import { useAuth } from '@/contexts/AuthContext';
import { PlayerPageHeader } from '@/components/player/PlayerComponents';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/layout/PageTransition';

export default function PlayerSettingsPage() {
  const { user } = useAuth();

  return (
    <PageTransition>
      <PlayerPageHeader title="Settings" description="Account and Discord connection" />
      <Card className="noxus-card-glow max-w-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              {user?.discordAvatar && <AvatarImage src={user.discordAvatar} />}
              <AvatarFallback>{user?.username?.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{user?.discordUsername || user?.username}</p>
              <Badge variant="secondary" className="text-[10px]">Discord Linked</Badge>
            </div>
          </div>
          <div className="text-sm space-y-2">
            <Row label="Citizen ID" value={user?.citizenid || 'Not linked'} />
            <Row label="Discord ID" value={user?.discordId || '—'} />
            <Row label="Auth" value={user?.authProvider || 'local'} />
          </div>
        </CardContent>
      </Card>
    </PageTransition>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-noxus-border/50">
      <span className="text-noxus-muted">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}
