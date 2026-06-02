'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useSocketStore } from '@/lib/stores/socket.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bell, Wifi, WifiOff, Heart } from 'lucide-react';
import Link from 'next/link';

const MOOD_EMOJI: Record<string, string> = {
  HAPPY: '😊', LOVED: '🥰', CALM: '😌', TIRED: '😴',
  SAD: '😢', EXCITED: '🤩', GRATEFUL: '🙏', MISSING_YOU: '🥺',
};

export function PartnerBar() {
  const { user } = useAuthStore();
  const { partnerOnline, partnerMood, connected } = useSocketStore();

  const { data: partnerData } = useQuery({
    queryKey: ['partner'],
    queryFn: () => apiClient.get('/users/me/partner').then((r) => r.data?.data),
    enabled: !!user?.coupleId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => apiClient.get('/notifications/unread-count').then((r) => r.data?.data),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const partner = partnerData;

  return (
    <header
      className="flex items-center justify-between px-4 py-3 border-b shrink-0"
      style={{ background: 'var(--clr-surface)', borderColor: 'var(--clr-border)' }}
    >
      <div className="flex items-center gap-2.5">
        {partner ? (
          <>
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarFallback style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)', fontSize: '0.75rem' }}>
                  {partner.displayName?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
                style={{
                  background: partnerOnline ? 'var(--clr-success)' : 'var(--clr-muted)',
                  borderColor: 'var(--clr-surface)',
                }}
              />
            </div>
            <div>
              <p className="text-sm font-medium leading-none" style={{ color: 'var(--clr-text)' }}>
                {partner.displayName}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--clr-muted)' }}>
                {partnerOnline ? 'Online' : 'Offline'}
                {partnerMood && ` · ${MOOD_EMOJI[partnerMood.mood] ?? ''}`}
              </p>
            </div>
          </>
        ) : (
          <Link
            href="/invite-partner"
            className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
            style={{ color: 'var(--clr-secondary)' }}
          >
            <Heart size={15} /> Invite your partner
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span title={connected ? 'Connected' : 'Disconnected'}>
          {connected ? <Wifi size={16} style={{ color: 'var(--clr-success)' }} /> : <WifiOff size={16} style={{ color: 'var(--clr-muted)' }} />}
        </span>

        <Link href="/notifications" className="relative">
          <Bell size={20} style={{ color: 'var(--clr-muted)' }} />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]" style={{ background: 'var(--clr-error)', color: '#fff' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Link>
      </div>
    </header>
  );
}
