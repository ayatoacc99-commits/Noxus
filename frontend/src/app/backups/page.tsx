'use client';

import { useEffect, useState } from 'react';
import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  PlusIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { connectSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { PageHeader, PageWrapper } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FadeIn } from '@/components/layout/PageTransition';

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
      return () => { socket.off('backup:progress', setProgress); };
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
    <PageWrapper>
      <PageHeader
        title="Backups"
        description="Manage server backups and scheduled retention"
        actions={
          canControl && (
            <Button onClick={create} className="gap-2">
              <PlusIcon className="w-4 h-4" /> Create Backup
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <FadeIn>
          <Card className="noxus-card-glow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-noxus-primary/20">
                <ArchiveBoxIcon className="w-6 h-6 text-noxus-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{backups.length}</p>
                <p className="text-xs text-noxus-muted">Total Backups</p>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.05}>
          <Card className="noxus-card-glow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-noxus-success/20">
                <ClockIcon className="w-6 h-6 text-noxus-success" />
              </div>
              <div>
                <p className="text-sm font-semibold">Daily at 3:00 AM</p>
                <p className="text-xs text-noxus-muted">Scheduled Backup</p>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.1}>
          <Card className="noxus-card-glow">
            <CardContent className="p-5">
              <p className="text-xs text-noxus-muted mb-1">Retention Policy</p>
              <p className="text-sm font-semibold">Keep last 7 backups</p>
              <p className="text-xs text-noxus-muted mt-1">Configure in Settings → BACKUP_RETENTION_COUNT</p>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {progress && (
        <Card className="mb-6 border-noxus-primary/30">
          <CardContent className="p-4">
            <div className="flex justify-between text-sm mb-2">
              <span>{progress.message}</span>
              <span className="text-noxus-primary font-medium">{progress.percent}%</span>
            </div>
            <Progress value={progress.percent} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Backup History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-noxus-muted border-b border-noxus-border bg-noxus-surface/50">
                  <th className="px-5 py-3 font-medium">Filename</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Size</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id} className="border-b border-noxus-border/50 hover:bg-noxus-surface/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs">{b.filename}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={b.status === 'completed' ? 'success' : b.status === 'running' ? 'default' : 'danger'}>
                        {b.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-noxus-text-secondary">{formatSize(b.size_bytes)}</td>
                    <td className="px-5 py-3.5 text-noxus-text-secondary">{new Date(b.created_at).toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        {b.status === 'completed' && (
                          <a href={`/api/backups/${b.id}/download`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ArrowDownTrayIcon className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                        {canControl && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-noxus-danger" onClick={() => remove(b.id)}>
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {backups.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-noxus-muted">
                      <ArchiveBoxIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      No backups yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
