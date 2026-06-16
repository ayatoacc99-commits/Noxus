'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('en', 'auth.invalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-noxus-bg via-noxus-surface to-noxus-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-noxus-accent to-purple-800 items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">{t('en', 'app.name')}</h1>
          <p className="text-noxus-muted mt-2">{t('en', 'app.tagline')}</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-noxus-danger/10 border border-noxus-danger/30 text-noxus-danger text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-noxus-muted mb-1">{t('en', 'auth.username')}</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-noxus-muted mb-1">{t('en', 'auth.password')}</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? t('en', 'common.loading') : t('en', 'auth.login')}
          </button>
        </form>
      </div>
    </div>
  );
}
