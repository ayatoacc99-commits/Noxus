'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader, PageWrapper } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function PerformancePage() {
  const [resources, setResources] = useState<Record<string, unknown>[]>([]);
  const [sort, setSort] = useState<'ms' | 'memory' | 'restarts'>('ms');

  const load = () => api.resourcePerformance().then((d) => setResources(d.resources || []));

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const sorted = [...resources].sort((a, b) => {
    if (sort === 'ms') return Number(b.currentMs) - Number(a.currentMs);
    if (sort === 'memory') return Number(b.memoryKb) - Number(a.memoryKb);
    return Number(b.restartCount) - Number(a.restartCount);
  });

  return (
    <PageWrapper>
      <PageHeader
        title="Resource Performance"
        description="txAdmin-style resource monitor"
        actions={
          <div className="flex gap-2">
            {(['ms', 'memory', 'restarts'] as const).map((s) => (
              <Button key={s} size="sm" variant={sort === s ? 'default' : 'ghost'} onClick={() => setSort(s)}>
                {s === 'ms' ? 'Highest ms' : s === 'memory' ? 'Memory' : 'Restarts'}
              </Button>
            ))}
          </div>
        }
      />

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-noxus-muted border-b border-noxus-border bg-noxus-surface/50">
                <th className="px-5 py-3">Resource</th>
                <th className="px-5 py-3">Current ms</th>
                <th className="px-5 py-3">Avg ms</th>
                <th className="px-5 py-3">Memory</th>
                <th className="px-5 py-3">Restarts</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={String(r.name)} className={cn('border-b border-noxus-border/50', r.problematic ? 'bg-noxus-danger/5' : '')}>
                  <td className="px-5 py-3 font-mono">{String(r.name)}</td>
                  <td className={cn('px-5 py-3', Number(r.currentMs) > 5 && 'text-noxus-danger font-bold')}>{String(r.currentMs)}</td>
                  <td className="px-5 py-3">{String(r.averageMs)}</td>
                  <td className="px-5 py-3">{Number(r.memoryKb).toLocaleString()} KB</td>
                  <td className="px-5 py-3">{String(r.restartCount)}</td>
                  <td className="px-5 py-3">
                    {r.problematic ? <Badge variant="danger">Problematic</Badge> : <Badge variant="success">OK</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
