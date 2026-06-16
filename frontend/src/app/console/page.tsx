'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { connectSocket } from '@/lib/socket';
import clsx from 'clsx';

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.consoleLogs({ search, level: levelFilter || undefined }).then((data) => setLogs(data.logs));
  }, [search, levelFilter]);

  useEffect(() => {
    if (!user) return;
    const socket = connectSocket(user);
    const onLine = (entry: LogEntry) => setLogs((prev) => [...prev.slice(-499), entry]);
    socket.on('console:line', onLine);
    return () => {
      socket.off('console:line', onLine);
    };
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

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

  return (
    <div className="space-y-4 h-[calc(100vh-3rem)] flex flex-col">
      <h1 className="text-2xl font-bold">Live Console</h1>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-noxus-muted" />
          <input
            className="input pl-10"
            placeholder="Filter logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-40"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
        >
          <option value="">All levels</option>
          <option value="info">Info</option>
          <option value="warn">Warnings</option>
          <option value="error">Errors</option>
          <option value="command">Commands</option>
        </select>
      </div>

      <div className="flex-1 card overflow-hidden flex flex-col font-mono text-sm">
        <div className="flex-1 overflow-y-auto p-4 space-y-0.5 bg-black/30">
          {logs.map((entry, i) => (
            <div
              key={`${entry.timestamp}-${i}`}
              className={clsx(
                'whitespace-pre-wrap break-all',
                entry.level === 'error' && 'text-noxus-danger',
                entry.level === 'warn' && 'text-noxus-warning',
                entry.level === 'command' && 'text-noxus-accent',
                entry.level === 'info' && 'text-noxus-text/80'
              )}
            >
              <span className="text-noxus-muted mr-2">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              {entry.line}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {canControl && (
          <form onSubmit={sendCommand} className="flex gap-2 p-3 border-t border-noxus-border">
            <input
              className="input flex-1 font-mono"
              placeholder="Enter console command..."
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
