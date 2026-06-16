'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function PlayerStatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'text-noxus-primary',
  delay = 0,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="noxus-card-glow p-5 backdrop-blur-sm bg-noxus-card/80 border border-white/5"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-noxus-muted uppercase tracking-wider">{label}</p>
        {Icon && <Icon className={cn('w-5 h-5', color)} />}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-noxus-text-secondary mt-1">{sub}</p>}
    </motion.div>
  );
}

export function PlayerPageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-noxus-text-secondary bg-clip-text text-transparent">
        {title}
      </h1>
      {description && <p className="text-noxus-text-secondary text-sm mt-1">{description}</p>}
    </div>
  );
}
