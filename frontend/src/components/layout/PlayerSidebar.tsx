'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Squares2X2Icon,
  UserCircleIcon,
  TruckIcon,
  HomeIcon,
  ChartBarIcon,
  BanknotesIcon,
  TrophyIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { NoxusLogo } from '@/components/brand/NoxusLogo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const nav = [
  { href: '/player/dashboard', icon: Squares2X2Icon, label: 'Dashboard' },
  { href: '/player/profile', icon: UserCircleIcon, label: 'Profile' },
  { href: '/player/vehicles', icon: TruckIcon, label: 'Vehicles' },
  { href: '/player/properties', icon: HomeIcon, label: 'Properties' },
  { href: '/player/statistics', icon: ChartBarIcon, label: 'Statistics' },
  { href: '/player/economy', icon: BanknotesIcon, label: 'Economy' },
  { href: '/player/leaderboards', icon: TrophyIcon, label: 'Leaderboards' },
  { href: '/player/settings', icon: Cog6ToothIcon, label: 'Settings' },
];

export function PlayerSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="flex flex-col h-full w-[260px] bg-noxus-surface/80 backdrop-blur-xl border-r border-noxus-border">
      <div className="p-5 border-b border-noxus-border">
        <div className="flex items-center gap-3">
          <NoxusLogo />
          <div>
            <h1 className="font-bold text-sm tracking-wider bg-gradient-to-r from-noxus-primary to-noxus-secondary bg-clip-text text-transparent">
              NOXUS PORTAL
            </h1>
            <p className="text-[10px] text-noxus-muted uppercase tracking-widest">Player Experience</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-noxus-primary/15 text-noxus-primary shadow-glow-sm'
                  : 'text-noxus-text-secondary hover:text-noxus-text hover:bg-white/5'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-noxus-border">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-noxus-card/80 border border-noxus-border backdrop-blur">
          <Avatar className="h-9 w-9 ring-2 ring-noxus-primary/30">
            {user?.discordAvatar && <AvatarImage src={user.discordAvatar} />}
            <AvatarFallback>{user?.discordUsername?.slice(0, 2) || 'PL'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.discordUsername || user?.username}</p>
            <Badge variant="secondary" className="text-[10px] mt-0.5">Player</Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
