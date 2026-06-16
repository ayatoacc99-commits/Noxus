import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { RoleShell } from '@/components/RoleShell';

export const metadata: Metadata = {
  title: 'Noxus Panel',
  description: 'FiveM QB-Core Server Management Panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>
          <RoleShell>{children}</RoleShell>
        </AuthProvider>
      </body>
    </html>
  );
}
