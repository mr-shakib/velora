'use client';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useSocketStore } from '@/lib/stores/socket.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { getAccessToken } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';

// WebSockets can't go through the Next.js rewrite proxy, so they connect to the
// API host directly. NEXT_PUBLIC_SOCKET_URL must point at the API origin in prod
// (where NEXT_PUBLIC_API_URL is the relative "/api").
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ||
  'http://localhost:3001';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const { setConnected, setPartnerOnline, setPartnerMood } = useSocketStore();
  const { applyTheme } = useThemeStore();
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('presence:online', () => setPartnerOnline(true));
    socket.on('presence:offline', () => setPartnerOnline(false));

    socket.on('mood:updated', (data: { mood: string; note?: string }) => setPartnerMood(data));

    socket.on('theme:updated', (data: { colors: Parameters<typeof applyTheme>[0] }) => {
      applyTheme(data.colors);
    });

    socket.on('memory:new', () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    });

    socket.on('chat:message', () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
    });

    socket.on('notification:new', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    });

    const keepalive = setInterval(() => socket.emit('presence:ping'), 30_000);

    return () => {
      clearInterval(keepalive);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user?.id]);

  return <>{children}</>;
}
