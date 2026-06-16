'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';

interface PlayerSummary {
  citizenid: string;
  name: string;
  phone?: string;
  cash?: number;
  bank?: number;
  job?: string;
  lastUpdated?: string;
}

export default function PlayersPage() {
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [notInstalled, setNotInstalled] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await api.searchPlayers(query);
      setNotInstalled(!data.installed);
      setPlayers(data.players || []);
      setSearched(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Player Manager</h1>

      <form onSubmit={search} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-noxus-muted" />
          <input
            className="input pl-10"
            placeholder="Search by citizenid, license, name, phone, discord..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary">Search</button>
      </form>

      {notInstalled && (
        <div className="card text-noxus-warning">QB-Core players table: Not installed</div>
      )}

      {searched && !notInstalled && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-noxus-muted border-b border-noxus-border">
                <th className="pb-3 pr-4">Citizen ID</th>
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Job</th>
                <th className="pb-3 pr-4">Cash</th>
                <th className="pb-3 pr-4">Bank</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.citizenid} className="border-b border-noxus-border/50">
                  <td className="py-3 pr-4 font-mono text-noxus-accent">{p.citizenid}</td>
                  <td className="py-3 pr-4">{p.name}</td>
                  <td className="py-3 pr-4">{p.job}</td>
                  <td className="py-3 pr-4">${p.cash?.toLocaleString()}</td>
                  <td className="py-3 pr-4">${p.bank?.toLocaleString()}</td>
                  <td className="py-3">
                    <Link href={`/players/${p.citizenid}`} className="text-noxus-accent hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {players.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-noxus-muted">No players found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
