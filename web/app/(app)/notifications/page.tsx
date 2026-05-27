'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { CheckCheck, Bell } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  readAt?: string;
  createdAt: string;
}

const TYPE_EMOJI: Record<string, string> = {
  MEMORY_CREATED: '📸',
  BUCKET_COMPLETED: '✅',
  ANNIVERSARY: '💑',
  BIRTHDAY: '🎂',
  PLAN_REMINDER: '📅',
  PARTNER_MOOD: '💭',
  SYSTEM: '🔔',
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get('/notifications').then((r) => r.data?.data),
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
      toast.success('All marked as read');
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const notifications: Notification[] = data ?? [];
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--clr-text)' }}>Notifications</h1>
          <p className="text-sm" style={{ color: 'var(--clr-muted)' }}>
            {unread > 0 ? `${unread} unread` : 'All caught up'}
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="gap-2 text-sm"
            style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-secondary)' }}
          >
            <CheckCheck size={15} /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🔔</p>
          <p className="text-lg font-medium mb-1" style={{ color: 'var(--clr-text)' }}>No notifications yet</p>
          <p className="text-sm" style={{ color: 'var(--clr-muted)' }}>We'll let you know when something happens</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {notifications.map((n) => (
              <motion.button
                key={n.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onClick={() => !n.readAt && markOneMutation.mutate(n.id)}
                className="w-full text-left rounded-2xl p-4 flex items-start gap-3 transition-all hover:opacity-90"
                style={{
                  background: n.readAt ? 'var(--clr-surface)' : 'var(--clr-bg)',
                  border: `1px solid ${n.readAt ? 'var(--clr-border)' : 'var(--clr-primary)'}`,
                }}
              >
                <span className="text-xl shrink-0 mt-0.5">{TYPE_EMOJI[n.type] ?? '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--clr-text)' }}>{n.title}</p>
                    {!n.readAt && <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: 'var(--clr-primary)' }} />}
                  </div>
                  {n.body && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--clr-muted)' }}>{n.body}</p>}
                  <p className="text-[10px] mt-1" style={{ color: 'var(--clr-muted)' }}>
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
