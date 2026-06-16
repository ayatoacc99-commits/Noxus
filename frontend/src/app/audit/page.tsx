'use client';

import { useEffect, useState } from 'react';
import { MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { PageHeader, PageWrapper } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AuditLog {
  id: number;
  username: string;
  role: string;
  action: string;
  target: string | null;
  ip_address: string | null;
  created_at: string;
}

const actionColors: Record<string, string> = {
  'auth.login': 'default',
  'server.start': 'success',
  'server.stop': 'danger',
  'server.restart': 'warning',
  'player.ban': 'danger',
  'backup.create': 'secondary',
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    api.auditLogs().then((d) => setLogs(d.logs)).catch(console.error);
  }, []);

  const actions = [...new Set(logs.map((l) => l.action))].sort();

  const filtered = logs.filter((l) => {
    if (search) {
      const q = search.toLowerCase();
      if (!l.username?.toLowerCase().includes(q) && !l.action?.toLowerCase().includes(q) && !l.target?.toLowerCase().includes(q)) return false;
    }
    if (actionFilter && l.action !== actionFilter) return false;
    return true;
  });

  const exportLogs = () => {
    const csv = ['Time,User,Role,Action,Target,IP', ...filtered.map((l) =>
      `"${l.created_at}","${l.username}","${l.role}","${l.action}","${l.target || ''}","${l.ip_address || ''}"`
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noxus-audit-${Date.now()}.csv`;
    a.click();
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Audit Logs"
        description="Track all administrative actions on your server"
        actions={
          <Button variant="outline" onClick={exportLogs} className="gap-2">
            <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-noxus-muted" />
          <Input className="pl-10" placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          className="noxus-input w-full sm:w-48"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-noxus-muted border-b border-noxus-border bg-noxus-surface/50">
                  <th className="px-5 py-3 font-medium">Timestamp</th>
                  <th className="px-5 py-3 font-medium">Admin</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Target</th>
                  <th className="px-5 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-noxus-border/50 hover:bg-noxus-surface/30 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-noxus-text-secondary text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 font-medium">{log.username}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className="capitalize text-[10px]">{log.role}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={(actionColors[log.action] || 'outline') as 'default'} className="font-mono text-[10px]">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-noxus-text-secondary">{log.target || '—'}</td>
                    <td className="px-5 py-3.5 text-xs text-noxus-muted">{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
