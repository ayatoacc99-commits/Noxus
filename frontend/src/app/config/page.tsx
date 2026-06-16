'use client';

import { useEffect, useState } from 'react';
import { Save, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function ConfigPage() {
  const { canControl, user } = useAuth();
  const [content, setContent] = useState('');
  const [masked, setMasked] = useState(true);
  const [warnings, setWarnings] = useState<{ key: string; message: string }[]>([]);

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
    alert(`Saved. Backup: ${result.backupName}`);
  };

  const reveal = async () => {
    if (!confirm('Reveal sensitive values? This action is logged.')) return;
    await load(true);
    setMasked(false);
  };

  if (!canControl) {
    return <p className="text-noxus-muted">You do not have permission to edit server config.</p>;
  }

  return (
    <div className="space-y-4 h-[calc(100vh-3rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">server.cfg Editor</h1>
        <div className="flex gap-2">
          {masked && user?.role === 'owner' && (
            <button className="btn-ghost" onClick={reveal}><Eye className="w-4 h-4" /> Reveal Secrets</button>
          )}
          <button className="btn-primary" onClick={save}><Save className="w-4 h-4" /> Save</button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="card border-noxus-warning/30 bg-noxus-warning/5">
          {warnings.map((w, i) => (
            <p key={i} className="text-sm text-noxus-warning">{w.message}</p>
          ))}
        </div>
      )}

      <textarea
        className="input flex-1 font-mono text-sm resize-none min-h-[500px]"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
