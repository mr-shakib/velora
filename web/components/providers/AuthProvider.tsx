'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth.store';
import { setAccessToken } from '@/lib/api/client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, clearSession } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    authApi
      .refresh()
      .then((res) => {
        const token = res.data?.accessToken;
        const user = res.data?.user;
        if (token) setAccessToken(token);
        if (user) setUser(user);
        else setUser(null);
      })
      .catch(() => setUser(null));

    const handleLogout = () => {
      clearSession();
      router.push('/login');
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  return <>{children}</>;
}
