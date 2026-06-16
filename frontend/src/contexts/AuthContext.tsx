'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  canControl: boolean;
  canEdit: boolean;
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
      .then((data) => setUser(data.user))
      .catch(() => {
        router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [pathname, router]);

  const login = async (username: string, password: string) => {
    await api.getCsrf();
    const data = await api.login(username, password);
    setUser(data.user);
    router.push('/dashboard');
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    router.push('/login');
  };

  const canControl = user?.role === 'owner' || user?.role === 'admin';
  const canEdit = canControl || user?.role === 'moderator';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, canControl, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
