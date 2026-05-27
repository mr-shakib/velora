'use client';
import { useEffect } from 'react';
import { useThemeStore, ThemeColors } from '@/lib/stores/theme.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { apiClient } from '@/lib/api/client';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { applyTheme } = useThemeStore();
  const { user } = useAuthStore();

  useEffect(() => {
    try {
      const cached = localStorage.getItem('velora:theme');
      if (cached) applyTheme(JSON.parse(cached) as Partial<ThemeColors>);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!user?.coupleId) return;
    apiClient
      .get('/theme')
      .then((res) => {
        const theme = res.data?.data;
        if (theme) applyTheme(theme);
      })
      .catch(() => null);
  }, [user?.coupleId]);

  return <>{children}</>;
}
