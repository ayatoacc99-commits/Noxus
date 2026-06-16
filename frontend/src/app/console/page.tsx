'use client';

import { useEffect, useRef, useState } from 'react';
import { PaperAirplaneIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { connectSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { PageHeader, PageWrapper } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LogEntry {
  timestamp: string;
  line: string;
  level: 'info' | 'warn' | 'error' | 'command';
}

export default function ConsolePage() {
  const { user, canControl } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [command, setCommand] = useState('');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.consoleLogs({ search, level: levelFilter || undefined }).then((data) => setLogs(data.logs));
  }, [search, levelFilter]);

  useEffect(() => {
    if (!user) return;
    const socket = connectSocket(user);
    const onLine = (entry: LogEntry) => setLogs((prev) => [...prev.slice(-999), entry]);
    socket.on('console:line', onLine);
    return () => { socket.off('console:line', onLine); };
  }, [user]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, autoScroll]);

  const sendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !canControl) return;
    try {
      await api.consoleCommand(command);
      setCommand('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Command failed');
    }
  };

  const filtered = logs.filter((l) => {
    if (search && !l.line.toLowerCase().includes(search.toLowerCase())) return false;
    if (levelFilter && l.level !== levelFilter) return false;
    return true;
  });

  const counts = {
    error: logs.filter((l) => l.level === 'error').length,
    warn: logs.filter((l) => l.level === 'warn').length,
    info: logs.filter((l) => l.level === 'info').length,
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Live Console"
        description="Real-time FiveM server logs with command input"
        actions={
          <div className="flex gap-2">
            <Badge variant="danger">{counts.error} errors</Badge>
            <Badge variant="warning">{counts.warn} warnings</Badge>
            <Badge variant="secondary">{counts.info} info</Badge>
          </div>
        }
      />

      <div className="flex flex-col gap-4 h-[calc(100vh-10rem)]">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-noxus-muted" />
            <Input
              className="pl-10"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(['', 'error', 'warn', 'info', 'command'] as const).map((level) => (
              <Button
                key={level || 'all'}
                variant={levelFilter === level ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLevelFilter(level)}
              >
                {level || 'All'}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setAutoScroll(!autoScroll)}>
              Auto-scroll {autoScroll ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden border-noxus-border">
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <div
              ref={containerRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed bg-[#080a0f]"
            >
              {filtered.map((entry, i) => (
                <div key={`${entry.timestamp}-${i}`} className="hover:bg-white/[0.02] px-1 rounded">
                  <span className="log-timestamp select-none">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>{' '}
                  <span className={cn(
                    entry.level === 'error' && 'log-error',
                    entry.level === 'warn' && 'log-warn',
                    entry.level === 'command' && 'log-command',
                    entry.level === 'info' && 'log-info'
                  )}>
                    {highlightSyntax(entry.line, entry.level)}
                  </span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {canControl && (
              <form onSubmit={sendCommand} className="flex gap-2 p-3 border-t border-noxus-border bg-noxus-surface">
                <span className="text-noxus-primary font-mono text-sm self-center pl-1">&gt;</span>
                <Input
                  className="flex-1 font-mono bg-transparent border-0 focus-visible:ring-0"
                  placeholder="Type a command..."
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                />
                <Button type="submit" size="icon"><PaperAirplaneIcon className="w-4 h-4" /></Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

function highlightSyntax(line: string, level: string) {
  if (level === 'error' && line.includes('Error')) {
    const parts = line.split('Error');
    return <>{parts[0]}<span className="font-semibold">Error</span>{parts[1]}</>;
  }
  if (level === 'warn' && line.includes('Warning')) {
    const parts = line.split('Warning');
    return <>{parts[0]}<span className="font-semibold">Warning</span>{parts[1]}</>;
  }
  return line;
}
