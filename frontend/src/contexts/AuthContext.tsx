'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, User, getRedirectForRole, isAdminRole } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string>;
  loginDiscord: () => Promise<void>;
  logout: () => Promise<void>;
  canControl: boolean;
  canEdit: boolean;
  isPlayer: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/login') {
      setLoading(false);
      return;
    }

    api
      .me()
      .then((data) => {
        setUser(data.user);
        enforceRoute(data.user, pathname);
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [pathname, router]);

  function enforceRoute(u: User, path: string) {
    if (path === '/login') return;
    const isPlayerRoute = path.startsWith('/player');
    const isAdminRoute = !isPlayerRoute && path !== '/login';

    if (u.role === 'player' && isAdminRoute) {
      router.replace('/player/dashboard');
    } else if (isAdminRole(u.role) && isPlayerRoute && !path.includes('/settings')) {
      // Admins can still visit player portal if they want
    }
  }

  const login = async (username: string, password: string) => {
    await api.getCsrf();
    const data = await api.login(username, password);
    setUser(data.user);
    const redirect = data.redirectTo || getRedirectForRole(data.user.role);
    router.push(redirect);
    return redirect;
  };

  const loginDiscord = async () => {
    const { url } = await api.discordAuthUrl();
    window.location.href = url;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    router.push('/login');
  };

  const isAdmin = isAdminRole(user?.role);
  const isPlayer = user?.role === 'player';
  const canControl = user?.role === 'owner' || user?.role === 'admin';
  const canEdit = canControl || user?.role === 'moderator';

  return (
    <AuthContext.Provider value={{ user, loading, login, loginDiscord, logout, canControl, canEdit, isPlayer, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
