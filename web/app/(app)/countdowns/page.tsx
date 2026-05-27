'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, isPast, format } from 'date-fns';
import { Plus, Trash2, Edit2, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface Countdown {
  id: string;
  label: string;
  targetAt: string;
  emoji?: string;
}

const PRESET_EMOJIS = ['🎂', '✈️', '💍', '🎉', '🏖️', '🎄', '💌', '🌟', '🎭', '🚀'];

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function CountdownDisplay({ targetAt }: { targetAt: string }) {
  const now = useNow();
  const target = new Date(targetAt);
  const past = isPast(target);

  if (past) {
    const days = differenceInDays(now, target);
    return <span className="text-sm font-medium" style={{ color: 'var(--clr-muted)' }}>{days}d ago</span>;
  }

  const totalSecs = differenceInSeconds(target, now);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (days > 0) {
    return (
      <div className="flex items-end gap-1">
        <span className="text-4xl font-bold tabular-nums" style={{ color: 'var(--clr-text)' }}>{days}</span>
        <span className="text-sm mb-1" style={{ color: 'var(--clr-muted)' }}>days</span>
        {hours > 0 && <>
          <span className="text-2xl font-semibold tabular-nums ml-1" style={{ color: 'var(--clr-secondary)' }}>{hours}</span>
          <span className="text-xs mb-1" style={{ color: 'var(--clr-muted)' }}>h</span>
        </>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 font-mono text-2xl font-bold tabular-nums" style={{ color: 'var(--clr-text)' }}>
      {String(hours).padStart(2, '0')}
      <span style={{ color: 'var(--clr-muted)' }}>:</span>
      {String(mins).padStart(2, '0')}
      <span style={{ color: 'var(--clr-muted)' }}>:</span>
      {String(secs).padStart(2, '0')}
    </div>
  );
}

export default function CountdownsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Countdown | null>(null);
  const [form, setForm] = useState({ label: '', targetAt: '', emoji: '🎉' });

  const { data, isLoading } = useQuery({
    queryKey: ['countdowns'],
    queryFn: () => apiClient.get('/countdowns').then((r) => r.data?.data),
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => apiClient.post('/countdowns', { ...d, targetAt: new Date(d.targetAt).toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
      setOpen(false);
      toast.success('Countdown added!');
    },
    onError: () => toast.error('Failed to add countdown'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: { id: string } & typeof form) =>
      apiClient.patch(`/countdowns/${id}`, { ...d, targetAt: new Date(d.targetAt).toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
      setOpen(false);
      toast.success('Updated!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/countdowns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
      toast.success('Removed');
    },
  });

  function openNew() {
    setEditing(null);
    setForm({ label: '', targetAt: '', emoji: '🎉' });
    setOpen(true);
  }

  function openEdit(c: Countdown) {
    setEditing(c);
    setForm({ label: c.label, targetAt: c.targetAt.slice(0, 16), emoji: c.emoji ?? '🎉' });
    setOpen(true);
  }

  function submit() {
    if (editing) updateMutation.mutate({ id: editing.id, ...form });
    else createMutation.mutate(form);
  }

  const countdowns: Countdown[] = data ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--clr-text)' }}>Countdowns</h1>
          <p className="text-sm" style={{ color: 'var(--clr-muted)' }}>Things to look forward to</p>
        </div>
        <Button onClick={openNew} style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }} className="gap-1.5">
          <Plus size={15} /> Add countdown
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : countdowns.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">⏳</p>
          <p className="text-lg font-medium mb-1" style={{ color: 'var(--clr-text)' }}>Nothing to count down to</p>
          <p className="text-sm mb-6" style={{ color: 'var(--clr-muted)' }}>Add an event you're both excited about</p>
          <Button onClick={openNew} style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}>Add your first countdown</Button>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-4">
            {[...countdowns].sort((a, b) => new Date(a.targetAt).getTime() - new Date(b.targetAt).getTime()).map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-2xl p-5 group relative overflow-hidden"
                style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl mt-0.5">{c.emoji ?? '🎉'}</span>
                    <div>
                      <p className="font-semibold text-base" style={{ color: 'var(--clr-text)' }}>{c.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--clr-muted)' }}>
                        {format(new Date(c.targetAt), 'MMMM d, yyyy · h:mm a')}
                      </p>
                        </div>
                  </div>
                  <div className="text-right shrink-0">
                    <CountdownDisplay targetAt={c.targetAt} />
                    {!isPast(new Date(c.targetAt)) && (
                      <p className="text-[10px] mt-1" style={{ color: 'var(--clr-muted)' }}>remaining</p>
                    )}
                  </div>
                </div>

                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--clr-muted)' }}>
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => deleteMutation.mutate(c.id)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--clr-error, #e57373)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit countdown' : 'Add a countdown'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Emoji</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setForm({ ...form, emoji: e })}
                    className="text-xl w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      background: form.emoji === e ? 'var(--clr-primary)' : 'var(--clr-bg)',
                      border: `1px solid ${form.emoji === e ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input placeholder="e.g. Our trip to Japan" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Date & time</Label>
              <Input type="datetime-local" value={form.targetAt} onChange={(e) => setForm({ ...form, targetAt: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1" style={{ borderColor: 'var(--clr-border)' }}>Cancel</Button>
              <Button
                className="flex-1"
                onClick={submit}
                disabled={!form.label || !form.targetAt || createMutation.isPending || updateMutation.isPending}
                style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving…' : editing ? 'Update' : 'Add countdown'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
