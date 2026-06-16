'use client';

import { useEffect, useState } from 'react';
import { CircleStackIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { PageHeader, PageWrapper } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FadeIn } from '@/components/layout/PageTransition';

const TABLE_INFO: Record<string, { description: string; searchable: boolean }> = {
  players: { description: 'QB-Core character data', searchable: true },
  player_vehicles: { description: 'Owned vehicles', searchable: false },
  player_houses: { description: 'Player properties', searchable: false },
  bans: { description: 'Ban records', searchable: false },
  permissions: { description: 'Admin permissions', searchable: false },
  gang_members: { description: 'Gang membership', searchable: false },
};

export default function DatabasePage() {
  const [tables, setTables] = useState<Record<string, boolean>>({});
  const [activeTable, setActiveTable] = useState('players');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<unknown[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.playerTables().then((d) => setTables(d.tables)).catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTable === 'players' && search.length >= 2) {
      setLoading(true);
      api.searchPlayers(search)
        .then((d) => setRecords(d.players || []))
        .finally(() => setLoading(false));
    }
  }, [activeTable, search]);

  const installedTables = Object.entries(tables);
  const exportRecords = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noxus-${activeTable}-${Date.now()}.json`;
    a.click();
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Database Browser"
        description="Browse and inspect QB-Core database tables"
        actions={
          records.length > 0 && (
            <Button variant="outline" onClick={exportRecords} className="gap-2">
              <ArrowDownTrayIcon className="w-4 h-4" /> Export JSON
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {installedTables.map(([name, installed], i) => (
          <FadeIn key={name} delay={i * 0.03}>
            <button
              onClick={() => { setActiveTable(name); setRecords([]); setSelectedRecord(null); }}
              className={`noxus-card-glow p-4 text-left w-full transition-all ${activeTable === name ? 'ring-2 ring-noxus-primary' : ''}`}
            >
              <CircleStackIcon className={`w-5 h-5 mb-2 ${installed ? 'text-noxus-success' : 'text-noxus-muted'}`} />
              <p className="text-sm font-medium font-mono">{name}</p>
              <Badge variant={installed ? 'success' : 'outline'} className="mt-1 text-[9px]">
                {installed ? 'Installed' : 'Not installed'}
              </Badge>
            </button>
          </FadeIn>
        ))}
      </div>

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse">Table Browser</TabsTrigger>
          <TabsTrigger value="json">JSON Viewer</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {!tables[activeTable] ? (
            <Card className="border-noxus-warning/30">
              <CardContent className="p-6 text-center text-noxus-warning">
                Table &quot;{activeTable}&quot; is not installed on this server
              </CardContent>
            </Card>
          ) : (
            <>
              {TABLE_INFO[activeTable]?.searchable && (
                <div className="relative max-w-md">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-noxus-muted" />
                  <Input
                    className="pl-10"
                    placeholder={`Search ${activeTable}...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-mono">{activeTable}</CardTitle>
                  <p className="text-xs text-noxus-muted">{TABLE_INFO[activeTable]?.description}</p>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-noxus-muted animate-pulse">Loading...</p>
                  ) : records.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-noxus-muted border-b border-noxus-border">
                            {Object.keys(records[0] as object).map((k) => (
                              <th key={k} className="pb-2 pr-4 font-medium">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((r, i) => (
                            <tr
                              key={i}
                              className="border-b border-noxus-border/50 hover:bg-noxus-surface/50 cursor-pointer"
                              onClick={() => setSelectedRecord(r)}
                            >
                              {Object.values(r as object).map((v, j) => (
                                <td key={j} className="py-2 pr-4 max-w-[200px] truncate font-mono">
                                  {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-noxus-muted text-sm py-8 text-center">
                      {TABLE_INFO[activeTable]?.searchable
                        ? 'Enter at least 2 characters to search'
                        : 'Direct table browsing available via player search for the players table'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="json">
          <Card>
            <CardContent className="p-5">
              {selectedRecord ? (
                <pre className="text-xs font-mono bg-black/30 rounded-lg p-4 overflow-auto max-h-[500px] text-noxus-text-secondary">
                  {JSON.stringify(selectedRecord, null, 2)}
                </pre>
              ) : (
                <p className="text-noxus-muted text-sm py-8 text-center">Select a record from the table browser to view JSON</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
