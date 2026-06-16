'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Squares2X2Icon,
  CommandLineIcon,
  UsersIcon,
  CubeIcon,
  CircleStackIcon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  LifebuoyIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  SignalIcon,
  BanknotesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { NoxusLogo } from '@/components/brand/NoxusLogo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const mainNav = [
  { href: '/dashboard', icon: Squares2X2Icon, label: 'Dashboard' },
  { href: '/console', icon: CommandLineIcon, label: 'Console' },
  { href: '/players', icon: UsersIcon, label: 'Players' },
  { href: '/resources', icon: CubeIcon, label: 'Resources' },
  { href: '/admin/performance', icon: ChartBarIcon, label: 'Performance' },
  { href: '/admin/monitor', icon: SignalIcon, label: 'Live Monitor' },
  { href: '/admin/economy', icon: BanknotesIcon, label: 'Economy' },
  { href: '/admin/gangs', icon: UserGroupIcon, label: 'Gangs' },
  { href: '/database', icon: CircleStackIcon, label: 'Database' },
  { href: '/backups', icon: ArchiveBoxIcon, label: 'Backups' },
  { href: '/audit', icon: ClipboardDocumentListIcon, label: 'Audit Logs' },
  { href: '/settings', icon: Cog6ToothIcon, label: 'Settings' },
];

const extrasNav = [
  { href: '/config', icon: BookOpenIcon, label: 'server.cfg' },
  { href: '#', icon: LifebuoyIcon, label: 'Support' },
  { href: '#', icon: ChatBubbleLeftRightIcon, label: 'Discord' },
];

interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ mobile, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) => {
    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          'relative group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
          active
            ? 'bg-noxus-primary/15 text-noxus-primary shadow-glow-sm'
            : 'text-noxus-text-secondary hover:text-noxus-text hover:bg-noxus-surface'
        )}
      >
        <Icon className={cn('w-5 h-5 shrink-0', active && 'text-noxus-primary')} />
        <span>{label}</span>
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 w-0.5 h-6 bg-noxus-primary rounded-r-full"
            style={{ position: 'absolute', left: 0 }}
          />
        )}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-noxus-surface border-r border-noxus-border',
        mobile ? 'w-full' : 'fixed left-0 top-0 w-[260px] z-40'
      )}
    >
      <div className="p-5 border-b border-noxus-border">
        <div className="flex items-center gap-3">
          <NoxusLogo />
          <div>
            <h1 className="font-bold text-sm tracking-wider text-noxus-text">NOXUS PANEL</h1>
            <p className="text-[10px] text-noxus-muted uppercase tracking-widest">Game Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-noxus-muted">Main</p>
          <div className="space-y-0.5 relative">
            {mainNav.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-noxus-muted">Extras</p>
          <div className="space-y-0.5">
            {extrasNav.map((item) => (
              <NavLink key={item.label} {...item} />
            ))}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-noxus-border">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-noxus-card border border-noxus-border">
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 status-dot-online ring-2 ring-noxus-card" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.username || 'Admin'}</p>
            <Badge variant="outline" className="mt-0.5 text-[10px] capitalize">{user?.role || 'owner'}</Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
