'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { PageHeader, PageWrapper } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FadeIn } from '@/components/layout/PageTransition';

interface PlayerSummary {
  citizenid: string;
  name: string;
  phone?: string;
  cash?: number;
  bank?: number;
  job?: string;
  lastUpdated?: string;
}

export default function PlayersPage() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [notInstalled, setNotInstalled] = useState(false);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await api.searchPlayers(q);
      setNotInstalled(!data.installed);
      setPlayers(data.players || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQ) search(initialQ);
  }, [initialQ, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2 || query === '') search(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  return (
    <PageWrapper>
      <PageHeader
        title="Player Management"
        description="Search and manage QB-Core player characters"
      />

      <div className="relative mb-6">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-noxus-muted" />
        <Input
          className="pl-12 h-12 text-base bg-noxus-card"
          placeholder="Search by citizenid, license, name, phone, discord..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {notInstalled && (
        <Card className="border-noxus-warning/30 bg-noxus-warning/5">
          <CardContent className="p-4 text-noxus-warning text-sm">QB-Core players table: Not installed</CardContent>
        </Card>
      )}

      {loading && <p className="text-noxus-muted text-sm animate-pulse">Searching...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {players.map((p, i) => (
          <FadeIn key={p.citizenid} delay={i * 0.05}>
            <Link href={`/players/${p.citizenid}`}>
              <motion.div whileHover={{ y: -2 }} className="noxus-card-glow p-5 cursor-pointer h-full">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-noxus-primary/20 text-noxus-primary text-lg">
                      {p.name?.slice(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{p.name || 'Unknown'}</h3>
                    <p className="text-xs font-mono text-noxus-primary mt-0.5">{p.citizenid}</p>
                    <Badge variant="outline" className="mt-2 text-[10px]">{p.job || 'Unemployed'}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-noxus-border">
                  <div>
                    <p className="text-[10px] text-noxus-muted uppercase">Cash</p>
                    <p className="text-sm font-semibold text-noxus-success">{formatMoney(p.cash)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-noxus-muted uppercase">Bank</p>
                    <p className="text-sm font-semibold text-noxus-secondary">{formatMoney(p.bank)}</p>
                  </div>
                </div>
              </motion.div>
            </Link>
          </FadeIn>
        ))}
      </div>

      {!loading && players.length === 0 && query && !notInstalled && (
        <div className="text-center py-16">
          <UserIcon className="w-12 h-12 mx-auto text-noxus-muted mb-3" />
          <p className="text-noxus-muted">No players found for &quot;{query}&quot;</p>
        </div>
      )}
    </PageWrapper>
  );
}
