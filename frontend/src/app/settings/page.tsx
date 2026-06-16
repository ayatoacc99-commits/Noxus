'use client';

import { useEffect, useState } from 'react';
import { Cog6ToothIcon, ShieldCheckIcon, ServerStackIcon } from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { PageHeader, PageWrapper } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FadeIn } from '@/components/layout/PageTransition';
import { NoxusLogo } from '@/components/brand/NoxusLogo';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.settings().then(setSettings).catch(console.error);
  }, []);

  if (!settings) {
    return <div className="flex items-center justify-center h-64 text-noxus-muted animate-pulse">Loading settings...</div>;
  }

  const paths = settings.paths as Record<string, string>;
  const env = settings.env as Record<string, unknown>;

  return (
    <PageWrapper>
      <PageHeader title="Settings" description="Panel configuration and server paths" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <FadeIn>
          <Card className="noxus-card-glow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <NoxusLogo className="w-10 h-10" />
                <div>
                  <CardTitle>NOXUS PANEL</CardTitle>
                  <p className="text-xs text-noxus-muted">Version 1.0.0 · QB-Core Edition</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(env).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-2 border-b border-noxus-border/50 last:border-0">
                  <span className="text-sm text-noxus-muted">{key}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">{String(value)}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.05}>
          <Card className="noxus-card-glow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ServerStackIcon className="w-5 h-5 text-noxus-primary" />
                <CardTitle>FiveM Paths</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(paths).map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs text-noxus-muted mb-0.5">{key}</p>
                  <p className="text-xs font-mono text-noxus-text-secondary break-all bg-noxus-surface rounded px-2 py-1.5">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="noxus-card-glow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-noxus-success" />
                <CardTitle>Security</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-noxus-muted">IP Allowlist</span>
                <Badge variant={env.ipAllowlistEnabled ? 'success' : 'outline'}>
                  {env.ipAllowlistEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-noxus-muted">2FA Support</span>
                <Badge variant="secondary">Ready</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-noxus-muted">CSRF Protection</span>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-noxus-muted">Backup Retention</span>
                <span>{String(env.backupRetention)} backups</span>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.15}>
          <Card className="noxus-card-glow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Cog6ToothIcon className="w-5 h-5 text-noxus-secondary" />
                <CardTitle>Two-Factor Authentication</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-noxus-text-secondary">
                2FA structure is ready. Enable TOTP per user via the database
                (<code className="text-noxus-primary text-xs">totp_secret</code>,{' '}
                <code className="text-noxus-primary text-xs">totp_enabled</code> fields)
                or extend this settings page in a future release.
              </p>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageWrapper>
  );
}
