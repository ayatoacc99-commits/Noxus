'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, PageWrapper } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MetricChart } from '@/components/charts/MetricCharts';

export default function AdminEconomyPage() {
  const { canControl } = useAuth();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [citizenid, setCitizenid] = useState('');
  const [amount, setAmount] = useState('');

  const load = () => api.adminEconomy().then(setData).catch(console.error);
  useEffect(() => { load(); }, []);

  const overview = data?.overview as Record<string, unknown>;
  const history = (data?.history as { time: string; circulation: number }[]) || [];
  const chartData = history.map((h) => ({ time: new Date(h.time).toLocaleDateString(), value: h.circulation }));

  const inject = async () => {
    await api.adminEconomyInject(citizenid, Number(amount));
    load();
  };

  const remove = async () => {
    await api.adminEconomyRemove(citizenid, Number(amount));
    load();
  };

  return (
    <PageWrapper>
      <PageHeader title="Economy Management" description="Server-wide economy tools" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="noxus-card-glow"><CardContent className="p-5"><p className="text-xs text-noxus-muted">Total Cash</p><p className="text-2xl font-bold">{formatMoney(overview?.totalCash as number)}</p></CardContent></Card>
        <Card className="noxus-card-glow"><CardContent className="p-5"><p className="text-xs text-noxus-muted">Total Bank</p><p className="text-2xl font-bold">{formatMoney(overview?.totalBank as number)}</p></CardContent></Card>
        <Card className="noxus-card-glow"><CardContent className="p-5"><p className="text-xs text-noxus-muted">Circulation</p><p className="text-2xl font-bold text-noxus-secondary">{formatMoney(overview?.totalCirculation as number)}</p></CardContent></Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Economy History</CardTitle></CardHeader>
        <CardContent><MetricChart data={chartData} color="#6D5DFE" unit="" /></CardContent>
      </Card>

      {canControl && (
        <Card>
          <CardHeader><CardTitle>Admin Controls</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3 items-end">
            <div><label className="text-xs text-noxus-muted">Citizen ID</label><Input value={citizenid} onChange={(e) => setCitizenid(e.target.value)} /></div>
            <div><label className="text-xs text-noxus-muted">Amount</label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <Button onClick={inject}>Inject Money</Button>
            <Button variant="danger" onClick={remove}>Remove Money</Button>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
