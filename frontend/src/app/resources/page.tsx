'use client';

import { useEffect, useState } from 'react';
import { Play, Square, RotateCcw, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import clsx from 'clsx';

interface Resource {
  name: string;
  type: string;
  ensured: boolean;
  critical: boolean;
}

export default function ResourcesPage() {
  const { canEdit } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.resources().then((d) => setResources(d.resources)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (name: string, action: string, critical = false) => {
    if (critical && action === 'stop') {
      if (!confirm(`${name} is a critical resource. Are you sure?`)) return;
      await api.resourceAction(name, action, true);
    } else {
      try {
        await api.resourceAction(name, action);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed';
        if (msg.includes('Critical')) {
          if (confirm(`${name} is critical. Force stop?`)) {
            await api.resourceAction(name, action, true);
          }
        } else {
          alert(msg);
        }
        return;
      }
    }
    load();
  };

  const toggleEnsure = async (name: string, ensured: boolean) => {
    await api.resourceEnsure(name, !ensured);
    load();
  };

  const typeColor = (type: string) => {
    if (type === 'qb-core') return 'text-blue-400';
    if (type === 'ox') return 'text-green-400';
    if (type === 'standalone') return 'text-yellow-400';
    return 'text-noxus-muted';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Resource Manager</h1>

      {loading ? (
        <p className="text-noxus-muted">Loading resources...</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-noxus-muted border-b border-noxus-border">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Ensured</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.name} className="border-b border-noxus-border/50">
                  <td className="py-3 pr-4 font-medium">
                    <span className="flex items-center gap-2">
                      {r.critical && <AlertTriangle className="w-4 h-4 text-noxus-warning" />}
                      {r.name}
                    </span>
                  </td>
                  <td className={clsx('py-3 pr-4 capitalize', typeColor(r.type))}>{r.type}</td>
                  <td className="py-3 pr-4">
                    {canEdit ? (
                      <button
                        onClick={() => toggleEnsure(r.name, r.ensured)}
                        className={clsx(
                          'px-2 py-0.5 rounded text-xs',
                          r.ensured ? 'bg-noxus-success/20 text-noxus-success' : 'bg-noxus-border text-noxus-muted'
                        )}
                      >
                        {r.ensured ? 'Yes' : 'No'}
                      </button>
                    ) : (
                      r.ensured ? 'Yes' : 'No'
                    )}
                  </td>
                  <td className="py-3">
                    {canEdit && (
                      <div className="flex gap-1">
                        <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => handleAction(r.name, 'start')}>
                          <Play className="w-3 h-3" />
                        </button>
                        <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => handleAction(r.name, 'stop', r.critical)}>
                          <Square className="w-3 h-3" />
                        </button>
                        <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => handleAction(r.name, 'restart')}>
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
