'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PlayerPageHeader } from '@/components/player/PlayerComponents';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/layout/PageTransition';

export default function PlayerPropertiesPage() {
  const [properties, setProperties] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.playerProperties().then((d) => setProperties(d.properties || [])).catch(console.error);
  }, []);

  return (
    <PageTransition>
      <PlayerPageHeader title="My Properties" description="Houses and real estate" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {properties.map((p, i) => (
          <Card key={i} className="noxus-card-glow overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-noxus-primary/20 to-noxus-secondary/10 flex items-center justify-center">
              <span className="text-noxus-muted text-sm">Map Preview</span>
            </div>
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold">{String(p.label || p.house || `Property ${i + 1}`)}</h3>
                <Badge variant="success">${Number(p.price || 0).toLocaleString()}</Badge>
              </div>
              <p className="text-xs text-noxus-muted mt-2">Location: {String(p.adress || p.coords || '—')}</p>
            </CardContent>
          </Card>
        ))}
        {properties.length === 0 && (
          <Card className="col-span-full"><CardContent className="p-12 text-center text-noxus-muted">No properties owned</CardContent></Card>
        )}
      </div>
    </PageTransition>
  );
}
