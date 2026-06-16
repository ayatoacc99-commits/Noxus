'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PlayerShell } from '@/components/PlayerShell';

export function RoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (pathname.startsWith('/player')) {
    return <PlayerShell>{children}</PlayerShell>;
  }

  return <AppShell>{children}</AppShell>;
}
