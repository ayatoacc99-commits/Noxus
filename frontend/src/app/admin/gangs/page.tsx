'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { PageHeader, PageWrapper } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AdminGangsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.adminGangs().then(setData).catch(console.error);
  }, []);

  const gangs = (data?.gangs as Record<string, unknown>[]) || [];

  return (
    <PageWrapper>
      <PageHeader title="Gang Analytics" description={`${data?.totalGangs || 0} gangs · ${data?.totalMembers || 0} members`} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Gangs" value={String(data?.totalGangs || 0)} />
        <StatCard label="Total Members" value={String(data?.totalMembers || 0)} />
        <StatCard label="Territories" value={String(data?.totalTerritories || 0)} />
        <StatCard label="Total Wealth" value={formatMoney(data?.totalWealth as number)} />
      </div>

      <div className="space-y-4">
        {gangs.map((g) => (
          <Card key={String(g.name)} className="noxus-card-glow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{String(g.label || g.name)}</CardTitle>
                <Badge variant="outline">{String(g.memberCount)} members</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                <div><span className="text-noxus-muted">Leader:</span> {String(g.leader || '—')}</div>
                <div><span className="text-noxus-muted">Wealth:</span> <span className="text-noxus-success">{formatMoney(g.wealth as number)}</span></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {((g.members as { name: string; gradeName: string }[]) || []).slice(0, 8).map((m, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">{m.name} · {m.gradeName}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="noxus-card-glow"><CardContent className="p-4"><p className="text-xs text-noxus-muted">{label}</p><p className="text-xl font-bold">{value}</p></CardContent></Card>
  );
}
