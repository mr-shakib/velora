'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, Check, Trash2, GripVertical, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface BucketItem {
  id: string;
  title: string;
  category?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  priority: number;
  completedAt?: string;
  addedBy: { id: string; displayName: string };
}

const CATEGORIES = ['Travel', 'Food', 'Adventure', 'Culture', 'Together', 'Personal'];
const CATEGORY_COLORS: Record<string, string> = {
  Travel: '#A8D5BA', Food: '#F4C2A1', Adventure: '#F9E4B7',
  Culture: '#C3B4F0', Together: '#F0B4C3', Personal: '#B4D4F0',
};

const STATUS_LABEL: Record<string, string> = { PENDING: 'To do', IN_PROGRESS: 'In progress', DONE: 'Done' };

export default function BucketPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE'>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['bucket'],
    queryFn: () => apiClient.get('/bucket').then((r) => r.data?.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['bucket', 'stats'],
    queryFn: () => apiClient.get('/bucket/stats').then((r) => r.data?.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: { title: string; category?: string }) => apiClient.post('/bucket', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket'] });
      setNewTitle('');
      setNewCategory('');
      toast.success('Added to bucket list!');
    },
    onError: () => toast.error('Failed to add item'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiClient.patch(`/bucket/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket'] });
      queryClient.invalidateQueries({ queryKey: ['bucket', 'stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/bucket/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket'] });
      queryClient.invalidateQueries({ queryKey: ['bucket', 'stats'] });
      toast.success('Removed');
    },
  });

  function addItem() {
    if (!newTitle.trim()) return;
    createMutation.mutate({ title: newTitle.trim(), category: newCategory || undefined });
  }

  function cycleStatus(item: BucketItem) {
    const next: Record<string, string> = { PENDING: 'IN_PROGRESS', IN_PROGRESS: 'DONE', DONE: 'PENDING' };
    updateMutation.mutate({ id: item.id, status: next[item.status] });
  }

  const items: BucketItem[] = data ?? [];
  const filtered = filter === 'ALL' ? items : items.filter((i) => i.status === filter);
  const completedPct = stats?.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--clr-text)' }}>Bucket List</h1>
        <p className="text-sm" style={{ color: 'var(--clr-muted)' }}>Things to do together</p>
      </div>

      {/* Progress */}
      {stats && (
        <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--clr-text)' }}>{stats.completed} of {stats.total} completed</span>
            <span style={{ color: 'var(--clr-secondary)' }}>{completedPct}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: 'var(--clr-bg)' }}>
            <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${completedPct}%`, background: 'var(--clr-primary)' }} />
          </div>
        </div>
      )}

      {/* Add new */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
        <div className="flex gap-2">
          <Input
            placeholder="Add something to your bucket list…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            style={{ borderColor: 'var(--clr-border)' }}
          />
          <Button onClick={addItem} disabled={!newTitle.trim() || createMutation.isPending} style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}>
            <Plus size={16} />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setNewCategory(newCategory === cat ? '' : cat)}
              className="text-xs px-2.5 py-1 rounded-full transition-all"
              style={{
                background: newCategory === cat ? CATEGORY_COLORS[cat] : 'var(--clr-bg)',
                color: 'var(--clr-text)',
                border: `1px solid ${newCategory === cat ? CATEGORY_COLORS[cat] : 'var(--clr-border)'}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--clr-bg)' }}>
        {(['ALL', 'PENDING', 'IN_PROGRESS', 'DONE'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="flex-1 text-xs py-1.5 rounded-lg transition-all font-medium"
            style={{
              background: filter === s ? 'var(--clr-surface)' : 'transparent',
              color: filter === s ? 'var(--clr-text)' : 'var(--clr-muted)',
              boxShadow: filter === s ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {s === 'ALL' ? 'All' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🪣</p>
          <p className="font-medium" style={{ color: 'var(--clr-text)' }}>
            {filter === 'ALL' ? 'No items yet' : `Nothing ${STATUS_LABEL[filter].toLowerCase()}`}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--clr-muted)' }}>
            {filter === 'ALL' ? 'Dream big — add your first item above!' : 'Check another filter'}
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {filtered.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-3 p-3 rounded-2xl group"
                style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}
              >
                {/* Status toggle */}
                <button
                  onClick={() => cycleStatus(item)}
                  className="shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: item.status === 'DONE' ? 'var(--clr-primary)' : item.status === 'IN_PROGRESS' ? 'var(--clr-secondary)' : 'var(--clr-border)',
                    background: item.status === 'DONE' ? 'var(--clr-primary)' : 'transparent',
                  }}
                >
                  {item.status === 'DONE' && <Check size={12} style={{ color: 'var(--clr-text)' }} />}
                  {item.status === 'IN_PROGRESS' && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--clr-secondary)' }} />}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{
                      color: 'var(--clr-text)',
                      textDecoration: item.status === 'DONE' ? 'line-through' : 'none',
                      opacity: item.status === 'DONE' ? 0.6 : 1,
                    }}
                  >
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.category && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: CATEGORY_COLORS[item.category] ?? 'var(--clr-bg)', color: 'var(--clr-text)' }}
                      >
                        {item.category}
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: 'var(--clr-muted)' }}>
                      by {item.addedBy.id === user?.id ? 'you' : item.addedBy.displayName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Badge
                    className="text-[10px] cursor-pointer"
                    onClick={() => cycleStatus(item)}
                    style={{ background: 'var(--clr-bg)', color: 'var(--clr-secondary)', border: '1px solid var(--clr-border)' }}
                  >
                    {STATUS_LABEL[item.status]}
                  </Badge>
                  <button
                    onClick={() => deleteMutation.mutate(item.id)}
                    className="p-1.5 rounded-lg hover:opacity-70"
                    style={{ color: 'var(--clr-error, #e57373)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
