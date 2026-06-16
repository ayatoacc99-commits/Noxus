'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { PageHeader, PageWrapper } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FadeIn } from '@/components/layout/PageTransition';

interface Resource {
  name: string;
  type: string;
  ensured: boolean;
  critical: boolean;
}

export default function ResourcesPage() {
  const { canEdit } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.resources().then((d) => setResources(d.resources)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (name: string, action: string, critical = false) => {
    if (critical && action === 'stop') {
      if (!confirm(`${name} is a critical resource. Are you sure?`)) return;
      await api.resourceAction(name, action, true);
    } else {
      try {
        await api.resourceAction(name, action);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed';
        if (msg.includes('Critical') && confirm(`${name} is critical. Force?`)) {
          await api.resourceAction(name, action, true);
        } else alert(msg);
        return;
      }
    }
    load();
  };

  const filtered = resources.filter((r) => {
    if (filter && !r.name.toLowerCase().includes(filter.toLowerCase())) return false;
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    return true;
  });

  const stats = {
    total: resources.length,
    ensured: resources.filter((r) => r.ensured).length,
    qb: resources.filter((r) => r.type === 'qb-core').length,
    ox: resources.filter((r) => r.type === 'ox').length,
  };

  const typeColor = (type: string) => ({
    'qb-core': 'text-blue-400 border-blue-400/30 bg-blue-400/10',
    ox: 'text-noxus-success border-noxus-success/30 bg-noxus-success/10',
    standalone: 'text-noxus-warning border-noxus-warning/30 bg-noxus-warning/10',
    custom: 'text-noxus-text-secondary border-noxus-border bg-noxus-surface',
  }[type] || 'text-noxus-text-secondary border-noxus-border bg-noxus-surface');

  return (
    <PageWrapper>
      <PageHeader
        title="Resource Manager"
        description={`${stats.total} resources · ${stats.ensured} ensured · ${stats.qb} QB · ${stats.ox} OX`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-noxus-primary' },
          { label: 'Ensured', value: stats.ensured, color: 'text-noxus-success' },
          { label: 'QB-Core', value: stats.qb, color: 'text-blue-400' },
          { label: 'OX', value: stats.ox, color: 'text-noxus-secondary' },
        ].map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.05}>
            <Card className="noxus-card-glow">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-noxus-muted mt-1">{s.label}</p>
              </CardContent>
            </Card>
          </FadeIn>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input placeholder="Filter resources..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
        <div className="flex gap-2 flex-wrap">
          {['all', 'qb-core', 'ox', 'standalone', 'custom'].map((t) => (
            <Button key={t} variant={typeFilter === t ? 'default' : 'ghost'} size="sm" onClick={() => setTypeFilter(t)} className="capitalize">
              {t === 'all' ? 'All' : t}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-noxus-muted animate-pulse">Loading resources...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r, i) => (
            <FadeIn key={r.name} delay={i * 0.03}>
              <motion.div whileHover={{ y: -2 }}>
                <Card className={cn('noxus-card-glow', r.critical && 'border-noxus-warning/30')}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CubeIcon className="w-5 h-5 text-noxus-primary" />
                        <span className="font-mono font-medium text-sm">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="status-dot-online" />
                        <span className="text-[10px] text-noxus-success">Running</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <Badge className={cn('text-[10px] border', typeColor(r.type))}>{r.type}</Badge>
                      {r.ensured && <Badge variant="success" className="text-[10px]">ensured</Badge>}
                      {r.critical && (
                        <Badge variant="warning" className="text-[10px] gap-1">
                          <ExclamationTriangleIcon className="w-3 h-3" /> critical
                        </Badge>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleAction(r.name, 'start')}>
                          <PlayIcon className="w-3.5 h-3.5" /> Start
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleAction(r.name, 'restart')}>
                          <ArrowPathIcon className="w-3.5 h-3.5" /> Restart
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleAction(r.name, 'stop', r.critical)}>
                          <StopIcon className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant={r.ensured ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => api.resourceEnsure(r.name, !r.ensured).then(load)}
                        >
                          {r.ensured ? '✓' : '+'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
