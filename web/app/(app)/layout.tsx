'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Sidebar } from '@/components/shared/Sidebar';
import { PartnerBar } from '@/components/shared/PartnerBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
    if (!isLoading && user && !user.coupleId) {
      router.push('/invite-partner');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--clr-bg)' }}>
        <div className="w-8 h-8 rounded-full animate-ping" style={{ background: 'var(--clr-primary)' }} />
      </div>
    );
  }

  if (!user) return null;
  // Redirecting to /invite-partner — don't flash the (empty) app shell.
  if (!user.coupleId) return null;

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--clr-bg)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <PartnerBar />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
