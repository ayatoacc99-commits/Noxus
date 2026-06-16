'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import {
  MagnifyingGlassIcon,
  Bars3Icon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { cn, formatUptime } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<{
    server: { online: boolean; ip: string; port: number; uptime: number | null; playerCount: number };
  } | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.dashboardStatus().then(setStatus).catch(() => {});
    const interval = setInterval(() => api.dashboardStatus().then(setStatus).catch(() => {}), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/players?q=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 h-16 px-4 lg:px-6 bg-noxus-bg/80 backdrop-blur-xl border-b border-noxus-border">
      <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={onMenuClick}>
        <Bars3Icon className="w-5 h-5" />
      </Button>

      {/* Server status pill */}
      <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-noxus-surface border border-noxus-border shrink-0">
        <span className={status?.server.online ? 'status-dot-online' : 'status-dot-offline'} />
        <div className="text-xs">
          <p className="font-medium text-noxus-text">
            {status ? `${status.server.ip}:${status.server.port}` : 'Server'}
          </p>
          <p className="text-noxus-muted">
            {status?.server.online ? formatUptime(status.server.uptime) : 'Offline'}
            {status?.server.online && ` · ${status.server.playerCount} players`}
          </p>
        </div>
        <Badge variant={status?.server.online ? 'success' : 'danger'} className="text-[10px]">
          {status?.server.online ? 'ONLINE' : 'OFFLINE'}
        </Badge>
      </div>

      {/* Global search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto hidden md:block">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-noxus-muted" />
          <Input
            className="pl-10 bg-noxus-surface/50 border-noxus-border/50 h-9"
            placeholder="Search anything..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex h-5 items-center gap-1 rounded border border-noxus-border bg-noxus-card px-1.5 text-[10px] text-noxus-muted">
            ⌘K
          </kbd>
        </div>
      </form>

      <div className="flex items-center gap-2 ml-auto">
        <NotificationCenter />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-noxus-surface transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{user?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="hidden lg:block text-sm font-medium">{user?.username}</span>
              <ChevronDownIcon className="w-4 h-4 text-noxus-muted hidden lg:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <UserCircleIcon className="w-4 h-4 mr-2" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Cog6ToothIcon className="w-4 h-4 mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-noxus-danger focus:text-noxus-danger">
              <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
