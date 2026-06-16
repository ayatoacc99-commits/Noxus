'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Terminal,
  Package,
  Users,
  FileCode,
  Archive,
  ScrollText,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'nav.dashboard' },
  { href: '/console', icon: Terminal, label: 'nav.console' },
  { href: '/resources', icon: Package, label: 'nav.resources' },
  { href: '/players', icon: Users, label: 'nav.players' },
  { href: '/config', icon: FileCode, label: 'nav.config' },
  { href: '/backups', icon: Archive, label: 'nav.backups' },
  { href: '/audit', icon: ScrollText, label: 'nav.audit' },
  { href: '/settings', icon: Settings, label: 'nav.settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-noxus-surface border-r border-noxus-border flex flex-col z-40">
      <div className="p-5 border-b border-noxus-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-noxus-accent to-purple-800 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Noxus</h1>
            <p className="text-xs text-noxus-muted">QB-Core Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-noxus-accent/20 text-noxus-accent'
                  : 'text-noxus-muted hover:text-noxus-text hover:bg-noxus-card'
              )}
            >
              <Icon className="w-4 h-4" />
              {t('en', item.label)}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-noxus-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{user?.username}</p>
            <p className="text-xs text-noxus-muted capitalize">{user?.role}</p>
          </div>
          <button onClick={logout} className="p-2 rounded-lg hover:bg-noxus-card text-noxus-muted hover:text-noxus-danger transition-colors" title={t('en', 'nav.logout')}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
