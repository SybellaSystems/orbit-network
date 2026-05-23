'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/orbit/AppShell';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { member, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !member) router.push('/login');
  }, [member, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse" style={{ animationDelay: '75ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse" style={{ animationDelay: '150ms' }} />
        </div>
      </div>
    );
  }

  if (!member) return null;
  return <AppShell>{children}</AppShell>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider><ProtectedLayout>{children}</ProtectedLayout></AuthProvider>;
}

