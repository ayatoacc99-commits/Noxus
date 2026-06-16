'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AuditLog {
  id: number;
  username: string;
  role: string;
  action: string;
  target: string | null;
  ip_address: string | null;
  created_at: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    api.auditLogs().then((d) => setLogs(d.logs)).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-noxus-muted border-b border-noxus-border">
              <th className="pb-3 pr-4">Time</th>
              <th className="pb-3 pr-4">User</th>
              <th className="pb-3 pr-4">Role</th>
              <th className="pb-3 pr-4">Action</th>
              <th className="pb-3 pr-4">Target</th>
              <th className="pb-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-noxus-border/50">
                <td className="py-3 pr-4 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                <td className="py-3 pr-4">{log.username}</td>
                <td className="py-3 pr-4 capitalize">{log.role}</td>
                <td className="py-3 pr-4 font-mono text-xs text-noxus-accent">{log.action}</td>
                <td className="py-3 pr-4 font-mono text-xs">{log.target || '—'}</td>
                <td className="py-3 text-xs text-noxus-muted">{log.ip_address || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
