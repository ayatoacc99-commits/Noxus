'use client';

import { useEffect, useState } from 'react';
import { EyeIcon, CheckIcon } from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, PageWrapper } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ConfigPage() {
  const { canControl, user } = useAuth();
  const [content, setContent] = useState('');
  const [masked, setMasked] = useState(true);
  const [warnings, setWarnings] = useState<{ key: string; message: string }[]>([]);
  const [saved, setSaved] = useState(false);

  const load = async (reveal = false) => {
    const data = await api.getServerCfg(reveal && user?.role === 'owner');
    setContent(data.content);
    setMasked(data.masked);
  };

  useEffect(() => { if (canControl) load(); }, [canControl]);

  const save = async () => {
    if (!confirm('Save server.cfg? A backup will be created automatically.')) return;
    const result = await api.saveServerCfg(content);
    setWarnings(result.warnings || []);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const reveal = async () => {
    if (!confirm('Reveal sensitive values? This action is logged.')) return;
    await load(true);
    setMasked(false);
  };

  if (!canControl) {
    return (
      <PageWrapper>
        <PageHeader title="server.cfg Editor" />
        <Card><CardContent className="p-6 text-noxus-muted">You do not have permission to edit server config.</CardContent></Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader
        title="server.cfg Editor"
        description="View and edit FiveM server configuration safely"
        actions={
          <div className="flex gap-2">
            {masked && user?.role === 'owner' && (
              <Button variant="outline" onClick={reveal} className="gap-2">
                <EyeIcon className="w-4 h-4" /> Reveal Secrets
              </Button>
            )}
            <Button onClick={save} className="gap-2">
              {saved ? <CheckIcon className="w-4 h-4" /> : null}
              {saved ? 'Saved!' : 'Save Changes'}
            </Button>
          </div>
        }
      />

      {warnings.length > 0 && (
        <Card className="mb-4 border-noxus-warning/30 bg-noxus-warning/5">
          <CardContent className="p-4 space-y-1">
            {warnings.map((w, i) => (
              <p key={i} className="text-sm text-noxus-warning flex items-center gap-2">
                <Badge variant="warning" className="text-[9px]">{w.key}</Badge> {w.message}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="bg-noxus-surface/50 border-b border-noxus-border py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono">server.cfg</CardTitle>
            {masked && <Badge variant="outline" className="text-[10px]">Secrets masked</Badge>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <textarea
            className="w-full min-h-[calc(100vh-16rem)] bg-[#080a0f] text-noxus-text font-mono text-sm p-5 resize-none focus:outline-none leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
          />
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
