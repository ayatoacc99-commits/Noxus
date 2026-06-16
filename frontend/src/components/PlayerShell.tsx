'use client';

import { ReactNode, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bars3Icon, XMarkIcon, BellIcon } from '@heroicons/react/24/outline';
import { PlayerSidebar } from '@/components/layout/PlayerSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NoxusLogo } from '@/components/brand/NoxusLogo';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export function PlayerShell({ children }: { children: ReactNode }) {
  const { loading, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-noxus-bg gap-4">
        <NoxusLogo className="w-12 h-12 animate-pulse" />
        <p className="text-noxus-muted text-sm">Loading Player Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-noxus-bg relative">
      <div className="fixed inset-0 bg-gradient-to-br from-noxus-primary/5 via-transparent to-noxus-secondary/5 pointer-events-none" />

      <div className="hidden lg:block fixed left-0 top-0 h-full z-40">
        <PlayerSidebar />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              className="fixed left-0 top-0 h-full z-50 lg:hidden">
              <Button variant="ghost" size="icon" className="absolute right-2 top-3 z-10" onClick={() => setMobileOpen(false)}>
                <XMarkIcon className="w-5 h-5" />
              </Button>
              <PlayerSidebar onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="lg:ml-[260px] relative z-10">
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-6 bg-noxus-bg/70 backdrop-blur-xl border-b border-noxus-border/50">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Bars3Icon className="w-5 h-5" />
            </Button>
            <h2 className="text-sm font-semibold text-noxus-text-secondary hidden sm:block">
              {pathname.split('/').pop()?.replace(/^\w/, (c) => c.toUpperCase())}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
          </div>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
