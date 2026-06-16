'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CpuChipIcon,
  CircleStackIcon,
  ServerStackIcon,
  UsersIcon,
  ArrowPathIcon,
  ArchiveBoxIcon,
  WrenchScrewdriverIcon,
  StopIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { connectSocket } from '@/lib/socket';
import { useMetricsHistory } from '@/hooks/useMetricsHistory';
import { formatUptime, formatBytes } from '@/lib/utils';
import { PageHeader, PageWrapper } from '@/components/layout/PageHeader';
import { MetricCard, MetricChart } from '@/components/charts/MetricCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FadeIn } from '@/components/layout/PageTransition';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface DashboardStatus {
  server: {
    online: boolean;
    uptime: number | null;
    ip: string;
    port: number;
    playerCount: number;
  };
  system: {
    hostname: string;
    cpuPercent: number;
    ram: { total: number; used: number; percent: number };
    disk: { total: string; used: string; percent: string } | null;
    platform: string;
  };
}

interface PlayerSummary {
  citizenid: string;
  name: string;
  job?: string;
  cash?: number;
  bank?: number;
}

interface Resource {
  name: string;
  type: string;
  ensured: boolean;
  critical: boolean;
}

interface LogEntry {
  timestamp: string;
  line: string;
  level: string;
}

interface Backup {
  id: number;
  filename: string;
  status: string;
  size_bytes: number | null;
  created_at: string;
}

export default function DashboardPage() {
  const { user, canControl } = useAuth();
  const [status, setStatus] = useState<DashboardStatus | null>(null);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastBackup, setLastBackup] = useState<Backup | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [maintenance, setMaintenance] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);

  const history = useMetricsHistory(status);

  const loadAll = async () => {
    try {
      const [s, p, r, l, b] = await Promise.all([
        api.dashboardStatus(),
        api.searchPlayers('').catch(() => ({ players: [] })),
        api.resources().catch(() => ({ resources: [] })),
        api.consoleLogs().catch(() => ({ logs: [] })),
        api.backups().catch(() => ({ backups: [] })),
      ]);
      setStatus(s);
      setPlayers((p.players || []).slice(0, 5));
      setResources((r.resources || []).filter((res: Resource) => res.critical || res.ensured).slice(0, 6));
      setLogs(l.logs?.slice(-8) || []);
      const completed = (b.backups || []).find((bk: Backup) => bk.status === 'completed');
      setLastBackup(completed || null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAll();
    if (user) {
      const socket = connectSocket(user);
      socket.on('server:status', setStatus);
      socket.on('console:line', (entry: LogEntry) => {
        setLogs((prev) => [...prev.slice(-7), entry]);
      });
      return () => {
        socket.off('server:status');
        socket.off('console:line');
      };
    }
  }, [user]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      if (action === 'restart') await api.serverRestart();
      else if (action === 'stop') await api.serverStop();
      else if (action === 'start') await api.serverStart();
      else if (action === 'backup') await api.createBackup();
      else if (action === 'resources') {
        const res = await api.resources();
        const critical = (res.resources || []).filter((r: Resource) => r.ensured);
        for (const r of critical.slice(0, 5)) {
          await api.resourceAction(r.name, 'restart').catch(() => {});
        }
      } else if (action === 'maintenance') {
        setMaintenance(!maintenance);
        if (!maintenance) {
          await api.consoleCommand('set sv_enforceGameBuild 0').catch(() => {});
        }
      }
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const cpuData = history.map((h) => ({ time: h.time, value: h.cpu }));
  const ramData = history.map((h) => ({ time: h.time, value: h.ram }));
  const playerData = history.map((h) => ({ time: h.time, value: h.players }));

  const diskPercent = status?.system.disk?.percent
    ? parseInt(status.system.disk.percent)
    : 0;

  return (
    <PageWrapper>
      <PageHeader
        title="Dashboard"
        description="Real-time overview of your FiveM QB-Core server"
        actions={
          <Badge variant={status?.server.online ? 'success' : 'danger'} className="text-xs px-3 py-1">
            {status?.server.online ? '● ONLINE' : '● OFFLINE'}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-5">
        {/* Server Status Card */}
        <FadeIn className="xl:col-span-3">
          <Card className="noxus-card-glow h-full border-noxus-success/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-noxus-text-secondary">Server Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-xl ${status?.server.online ? 'bg-noxus-success/20' : 'bg-noxus-danger/20'}`}>
                  <ServerStackIcon className={`w-8 h-8 ${status?.server.online ? 'text-noxus-success' : 'text-noxus-danger'}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${status?.server.online ? 'text-noxus-success' : 'text-noxus-danger'}`}>
                    {status?.server.online ? 'ONLINE' : 'OFFLINE'}
                  </p>
                  <p className="text-xs text-noxus-muted">QB-Core Framework</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <Row label="Uptime" value={formatUptime(status?.server.uptime ?? null)} />
                <Row label="Players" value={`${status?.server.playerCount ?? 0} / 64`} />
                <Row label="Server IP" value={`${status?.server.ip}:${status?.server.port}`} mono />
                <Row label="Hostname" value={status?.system.hostname || '—'} />
                <Row label="Platform" value={status?.system.platform || 'Linux'} />
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Metric cards */}
        <div className="xl:col-span-9 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <FadeIn delay={0.05}>
            <MetricCard
              title="CPU Usage"
              value={`${status?.system.cpuPercent ?? 0}%`}
              icon={CpuChipIcon}
              color="#4F46E5"
              sparkData={cpuData}
            />
          </FadeIn>
          <FadeIn delay={0.1}>
            <MetricCard
              title="RAM Usage"
              value={`${status?.system.ram.percent ?? 0}%`}
              subtitle={status ? `${formatBytes(status.system.ram.used)} used` : undefined}
              icon={CircleStackIcon}
              color="#06B6D4"
              sparkData={ramData}
            />
          </FadeIn>
          <FadeIn delay={0.15}>
            <MetricCard
              title="Disk Usage"
              value={status?.system.disk?.percent || '—'}
              subtitle={status?.system.disk ? `${status.system.disk.used} / ${status.system.disk.total}` : undefined}
              icon={ServerStackIcon}
              color="#F59E0B"
              sparkData={cpuData.map((d) => ({ ...d, value: diskPercent }))}
            />
          </FadeIn>
          <FadeIn delay={0.2}>
            <MetricCard
              title="Players Online"
              value={`${status?.server.playerCount ?? 0}`}
              subtitle="of 64 slots"
              icon={UsersIcon}
              color="#10B981"
              sparkData={playerData}
            />
          </FadeIn>
        </div>

        {/* Quick Actions */}
        {canControl && (
          <FadeIn delay={0.25} className="xl:col-span-12">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => handleAction('restart')} disabled={!!actionLoading} className="gap-2">
                    <ArrowPathIcon className="w-4 h-4" /> Restart Server
                  </Button>
                  <Button variant="secondary" onClick={() => handleAction('resources')} disabled={!!actionLoading}>
                    <ArrowPathIcon className="w-4 h-4" /> Restart Resources
                  </Button>
                  <Button variant="success" onClick={() => handleAction('backup')} disabled={!!actionLoading}>
                    <ArchiveBoxIcon className="w-4 h-4" /> Create Backup
                  </Button>
                  <Button
                    variant="warning"
                    onClick={() => handleAction('maintenance')}
                    disabled={!!actionLoading}
                    className={maintenance ? 'ring-2 ring-noxus-warning' : ''}
                  >
                    <WrenchScrewdriverIcon className="w-4 h-4" /> {maintenance ? 'Exit Maintenance' : 'Maintenance Mode'}
                  </Button>
                  <Button variant="danger" onClick={() => handleAction('stop')} disabled={!!actionLoading}>
                    <StopIcon className="w-4 h-4" /> Stop Server
                  </Button>
                  {!status?.server.online && (
                    <Button variant="success" onClick={() => handleAction('start')} disabled={!!actionLoading}>
                      <PlayIcon className="w-4 h-4" /> Start Server
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* Players Online */}
        <FadeIn delay={0.3} className="xl:col-span-4">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Players Online</CardTitle>
              <Link href="/players" className="text-xs text-noxus-primary hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {players.length === 0 ? (
                <p className="text-sm text-noxus-muted py-4 text-center">No players online</p>
              ) : (
                players.map((p) => (
                  <Link
                    key={p.citizenid}
                    href={`/players/${p.citizenid}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-noxus-surface transition-colors group"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-noxus-primary/20 text-noxus-primary">
                        {p.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-noxus-primary transition-colors">{p.name}</p>
                      <p className="text-xs text-noxus-muted font-mono">{p.citizenid}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-[10px]">{p.job || 'Citizen'}</Badge>
                      <p className="text-xs text-noxus-success mt-0.5">${((p.cash || 0) + (p.bank || 0)).toLocaleString()}</p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* Resource Status */}
        <FadeIn delay={0.35} className="xl:col-span-4">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Resource Status</CardTitle>
              <Link href="/resources" className="text-xs text-noxus-primary hover:underline">Manage</Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {resources.map((r) => (
                  <div key={r.name} className="flex items-center justify-between py-2 border-b border-noxus-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="status-dot-online" />
                      <span className="text-sm font-mono">{r.name}</span>
                      {r.critical && <Badge variant="warning" className="text-[9px]">core</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => api.resourceAction(r.name, 'restart').catch(console.error)}
                      >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Console Preview */}
        <FadeIn delay={0.4} className="xl:col-span-4">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Console</CardTitle>
              <Link href="/console" className="text-xs text-noxus-primary hover:underline">Open full</Link>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-[200px]">
              <div ref={consoleRef} className="flex-1 bg-black/40 rounded-lg p-3 font-mono text-xs overflow-y-auto space-y-0.5">
                {logs.map((entry, i) => (
                  <div key={i} className={logClass(entry.level)}>
                    <span className="log-timestamp">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>{' '}
                    {entry.line}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Bottom row */}
        <FadeIn delay={0.45} className="xl:col-span-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Last Backup</CardTitle></CardHeader>
            <CardContent>
              {lastBackup ? (
                <>
                  <p className="text-lg font-semibold">{new Date(lastBackup.created_at).toLocaleTimeString()}</p>
                  <p className="text-xs text-noxus-muted mt-1">
                    {lastBackup.size_bytes ? `${(lastBackup.size_bytes / 1024 / 1024).toFixed(1)} MB` : '—'}
                  </p>
                  <Badge variant="success" className="mt-2">SUCCESS</Badge>
                </>
              ) : (
                <p className="text-sm text-noxus-muted">No backups yet</p>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.5} className="xl:col-span-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Server Information</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="OS" value={`${status?.system.platform || 'Linux'} • Ubuntu`} />
              <Row label="Framework" value="qb-core" />
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-noxus-muted">Memory</span>
                  <span>{status?.system.ram.percent ?? 0}%</span>
                </div>
                <Progress value={status?.system.ram.percent ?? 0} indicatorClassName="bg-noxus-secondary" />
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.55} className="xl:col-span-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Memory Graph (24H)</CardTitle>
              <p className="text-xs text-noxus-muted">
                {status ? formatBytes(status.system.ram.used) : '—'} current usage
              </p>
            </CardHeader>
            <CardContent>
              <MetricChart data={ramData} color="#4F46E5" unit="%" height={120} />
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Full width charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
        <FadeIn delay={0.6}>
          <Card>
            <CardHeader><CardTitle className="text-sm">CPU History</CardTitle></CardHeader>
            <CardContent><MetricChart data={cpuData} color="#4F46E5" label="CPU %" /></CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.65}>
          <Card>
            <CardHeader><CardTitle className="text-sm">RAM History</CardTitle></CardHeader>
            <CardContent><MetricChart data={ramData} color="#06B6D4" label="RAM %" /></CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.7}>
          <Card>
            <CardHeader><CardTitle className="text-sm">Player Count</CardTitle></CardHeader>
            <CardContent><MetricChart data={playerData} color="#10B981" label="Players" unit="" /></CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageWrapper>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-noxus-muted">{label}</span>
      <span className={mono ? 'font-mono text-xs text-noxus-text-secondary' : 'text-noxus-text-secondary'}>{value}</span>
    </div>
  );
}

function logClass(level: string) {
  if (level === 'error') return 'log-error';
  if (level === 'warn') return 'log-warn';
  if (level === 'command') return 'log-command';
  return 'log-info';
}
