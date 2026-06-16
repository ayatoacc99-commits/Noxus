'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

export function AppShell({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  const pathname = usePathname();

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-noxus-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 p-6 min-h-screen">{children}</main>
    </div>
  );
}
