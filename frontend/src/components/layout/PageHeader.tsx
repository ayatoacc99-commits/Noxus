'use client';

import { ReactNode } from 'react';
import { PageTransition } from '@/components/layout/PageTransition';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-noxus-text">{title}</h1>
        {description && <p className="text-noxus-text-secondary text-sm mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function PageWrapper({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
