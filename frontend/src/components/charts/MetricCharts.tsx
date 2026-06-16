'use client';

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

interface SparklineProps {
  data: { time: string; value: number }[];
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = '#4F46E5', height = 40 }: SparklineProps) {
  if (!data.length) return <div style={{ height }} className="opacity-30" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface MetricChartProps {
  data: { time: string; value: number }[];
  color?: string;
  label?: string;
  unit?: string;
  height?: number;
}

export function MetricChart({ data, color = '#4F46E5', label, unit = '%', height = 200 }: MetricChartProps) {
  return (
    <div className="w-full">
      {label && <p className="text-xs text-noxus-muted mb-2">{label}</p>}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`chart-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
          <Tooltip
            contentStyle={{
              background: '#1A2230',
              border: '1px solid #243044',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value) => [`${value ?? 0}${unit}`, label || '']}
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#chart-${color})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  sparkData?: { time: string; value: number }[];
  className?: string;
}

export function MetricCard({ title, value, subtitle, icon: Icon, color, sparkData, className }: MetricCardProps) {
  return (
    <div className={cn('noxus-card-glow p-4', className)}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <span className="text-xs text-noxus-text-secondary font-medium">{title}</span>
        </div>
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      {subtitle && <p className="text-xs text-noxus-muted mb-2">{subtitle}</p>}
      {sparkData && sparkData.length > 0 && <Sparkline data={sparkData} color={color} />}
    </div>
  );
}
