'use client';

import { useEffect, useState } from 'react';
import { Play, Square, RotateCcw, Archive, Server, Cpu, HardDrive, Users, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { connectSocket } from '@/lib/socket';
import { t } from '@/lib/i18n';

interface DashboardStatus {
  server: {
    online: boolean;
    uptime: number | null;
    ip: string;
    port: number;
    playerCount: number;
  };
  system: {
    cpuPercent: number;
    ram: { total: number; used: number; percent: number };
    disk: { total: string; used: string; percent: string } | null;
  };
}

function formatUptime(seconds: number | null) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function formatBytes(bytes: number) {
  const gb = bytes / (1024 ** 3);
  return `${gb.toFixed(1)} GB`;
}

export default function DashboardPage() {
  const { user, canControl } = useAuth();
  const [status, setStatus] = useState<DashboardStatus | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadStatus = () => api.dashboardStatus().then(setStatus).catch(console.error);

  useEffect(() => {
    loadStatus();
    if (user) {
      const socket = connectSocket(user);
      socket.on('server:status', setStatus);
      return () => {
        socket.off('server:status');
      };
    }
  }, [user]);

  const handleAction = async (action: 'start' | 'stop' | 'restart' | 'backup') => {
    setActionLoading(action);
    try {
      if (action === 'start') await api.serverStart();
      else if (action === 'stop') await api.serverStop();
      else if (action === 'restart') await api.serverRestart();
      else if (action === 'backup') await api.createBackup();
      await loadStatus();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('en', 'dashboard.title')}</h1>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              status?.server.online
                ? 'bg-noxus-success/20 text-noxus-success'
                : 'bg-noxus-danger/20 text-noxus-danger'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${status?.server.online ? 'bg-noxus-success' : 'bg-noxus-danger'}`} />
            {status?.server.online ? t('en', 'dashboard.online') : t('en', 'dashboard.offline')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Server} label="Server" value={`${status?.server.ip}:${status?.server.port}`} />
        <StatCard icon={Users} label={t('en', 'dashboard.players')} value={String(status?.server.playerCount ?? 0)} />
        <StatCard icon={Clock} label={t('en', 'dashboard.uptime')} value={formatUptime(status?.server.uptime ?? null)} />
        <StatCard icon={Cpu} label={t('en', 'dashboard.cpu')} value={`${status?.system.cpuPercent ?? 0}%`} />
        <StatCard
          icon={HardDrive}
          label={t('en', 'dashboard.ram')}
          value={status ? `${formatBytes(status.system.ram.used)} / ${formatBytes(status.system.ram.total)}` : '—'}
          sub={`${status?.system.ram.percent ?? 0}%`}
        />
        <StatCard
          icon={HardDrive}
          label={t('en', 'dashboard.disk')}
          value={status?.system.disk ? `${status.system.disk.used} / ${status.system.disk.total}` : '—'}
          sub={status?.system.disk?.percent}
        />
      </div>

      {canControl && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" onClick={() => handleAction('start')} disabled={!!actionLoading}>
              <Play className="w-4 h-4" /> {t('en', 'dashboard.start')}
            </button>
            <button className="btn-danger" onClick={() => handleAction('stop')} disabled={!!actionLoading}>
              <Square className="w-4 h-4" /> {t('en', 'dashboard.stop')}
            </button>
            <button className="btn-ghost" onClick={() => handleAction('restart')} disabled={!!actionLoading}>
              <RotateCcw className="w-4 h-4" /> {t('en', 'dashboard.restart')}
            </button>
            <button className="btn-ghost" onClick={() => handleAction('backup')} disabled={!!actionLoading}>
              <Archive className="w-4 h-4" /> {t('en', 'dashboard.backup')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5 text-noxus-accent" />
        <span className="text-sm text-noxus-muted">{label}</span>
      </div>
      <p className="text-xl font-semibold truncate">{value}</p>
      {sub && <p className="text-sm text-noxus-muted mt-1">{sub}</p>}
    </div>
  );
}
