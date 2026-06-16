'use client';

import { useEffect, useState, useCallback } from 'react';

export interface MetricsPoint {
  time: string;
  cpu: number;
  ram: number;
  players: number;
}

const MAX_POINTS = 24;

export function useMetricsHistory(status: {
  system?: { cpuPercent?: number; ram?: { percent?: number } };
  server?: { playerCount?: number };
} | null) {
  const [history, setHistory] = useState<MetricsPoint[]>([]);

  const pushPoint = useCallback(() => {
    if (!status) return;
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const point: MetricsPoint = {
      time,
      cpu: status.system?.cpuPercent ?? 0,
      ram: status.system?.ram?.percent ?? 0,
      players: status.server?.playerCount ?? 0,
    };
    setHistory((prev) => [...prev.slice(-(MAX_POINTS - 1)), point]);
  }, [status]);

  useEffect(() => {
    pushPoint();
    const interval = setInterval(pushPoint, 5000);
    return () => clearInterval(interval);
  }, [pushPoint]);

  return history;
}
