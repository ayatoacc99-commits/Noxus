'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.settings().then(setSettings).catch(console.error);
  }, []);

  if (!settings) return <p className="text-noxus-muted">Loading...</p>;

  const paths = settings.paths as Record<string, string>;
  const env = settings.env as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <h2 className="font-semibold">FiveM Paths</h2>
          {Object.entries(paths).map(([key, value]) => (
            <div key={key} className="text-sm">
              <span className="text-noxus-muted block">{key}</span>
              <span className="font-mono text-xs break-all">{value}</span>
            </div>
          ))}
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold">Environment</h2>
          {Object.entries(env).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-noxus-muted">{key}</span>
              <span>{String(value)}</span>
            </div>
          ))}
        </div>

        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-2">2FA Ready</h2>
          <p className="text-sm text-noxus-muted">
            Two-factor authentication structure is in place. Enable TOTP per user via the database
            (<code className="text-noxus-accent">totp_secret</code>, <code className="text-noxus-accent">totp_enabled</code> fields)
            or extend the settings UI in a future release.
          </p>
        </div>
      </div>
    </div>
  );
}
