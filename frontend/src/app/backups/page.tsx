'use client';

import { useEffect, useState } from 'react';
import { Archive, Download, Trash2, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { connectSocket } from '@/lib/socket';
import clsx from 'clsx';

interface Backup {
  id: number;
  filename: string;
  status: string;
  size_bytes: number | null;
  created_at: string;
  completed_at: string | null;
}

export default function BackupsPage() {
  const { user, canControl } = useAuth();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [progress, setProgress] = useState<{ percent: number; message: string } | null>(null);

  const load = () => api.backups().then((d) => setBackups(d.backups)).catch(console.error);

  useEffect(() => {
    load();
    if (user) {
      const socket = connectSocket(user);
      socket.on('backup:progress', setProgress);
      return () => {
        socket.off('backup:progress', setProgress);
      };
    }
  }, [user]);

  const create = async () => {
    await api.createBackup();
    setTimeout(load, 2000);
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this backup?')) return;
    await api.deleteBackup(id);
    load();
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    return `${(bytes / (1024 ** 2)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Backups</h1>
        {canControl && (
          <button className="btn-primary" onClick={create}><Plus className="w-4 h-4" /> Create Backup</button>
        )}
      </div>

      {progress && (
        <div className="card">
          <div className="flex justify-between text-sm mb-2">
            <span>{progress.message}</span>
            <span>{progress.percent}%</span>
          </div>
          <div className="h-2 bg-noxus-border rounded-full overflow-hidden">
            <div className="h-full bg-noxus-accent transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-noxus-muted border-b border-noxus-border">
              <th className="pb-3 pr-4">Filename</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-4">Size</th>
              <th className="pb-3 pr-4">Created</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <tr key={b.id} className="border-b border-noxus-border/50">
                <td className="py-3 pr-4 font-mono text-xs">{b.filename}</td>
                <td className="py-3 pr-4">
                  <span className={clsx(
                    'px-2 py-0.5 rounded text-xs',
                    b.status === 'completed' && 'bg-noxus-success/20 text-noxus-success',
                    b.status === 'running' && 'bg-noxus-accent/20 text-noxus-accent',
                    b.status === 'failed' && 'bg-noxus-danger/20 text-noxus-danger'
                  )}>
                    {b.status}
                  </span>
                </td>
                <td className="py-3 pr-4">{formatSize(b.size_bytes)}</td>
                <td className="py-3 pr-4">{new Date(b.created_at).toLocaleString()}</td>
                <td className="py-3">
                  <div className="flex gap-1">
                    {b.status === 'completed' && (
                      <a href={`/api/backups/${b.id}/download`} className="btn-ghost !px-2 !py-1">
                        <Download className="w-3 h-3" />
                      </a>
                    )}
                    {canControl && (
                      <button className="btn-ghost !px-2 !py-1 text-noxus-danger" onClick={() => remove(b.id)}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {backups.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-noxus-muted"><Archive className="w-8 h-8 mx-auto mb-2 opacity-50" />No backups yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
