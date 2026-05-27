'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface TimelineEvent {
  id: string;
  title: string;
  story?: string;
  eventDate: string;
  location?: string;
  mediaPublicId?: string;
  author: { id: string; displayName: string };
}

export default function TimelinePage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TimelineEvent | null>(null);
  const [form, setForm] = useState({ title: '', story: '', eventDate: '', location: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['timeline'],
    queryFn: () => apiClient.get('/timeline').then((r) => r.data?.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => apiClient.post('/timeline', { ...d, eventDate: new Date(d.eventDate).toISOString() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['timeline'] }); setOpen(false); toast.success('Milestone added!'); },
    onError: () => toast.error('Failed to add milestone'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/timeline/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['timeline'] }); toast.success('Removed'); },
  });

  function openNew() { setEditing(null); setForm({ title: '', story: '', eventDate: '', location: '' }); setOpen(true); }
  function openEdit(e: TimelineEvent) { setEditing(e); setForm({ title: e.title, story: e.story ?? '', eventDate: e.eventDate.split('T')[0], location: e.location ?? '' }); setOpen(true); }

  const events: TimelineEvent[] = data ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--clr-text)' }}>Our Story</h1>
          <p className="text-sm" style={{ color: 'var(--clr-muted)' }}>Every milestone on your journey together</p>
        </div>
        <Button onClick={openNew} style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }} className="gap-2">
          <Plus size={16} /> Add milestone
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🗺️</p>
          <p className="text-lg font-medium mb-1" style={{ color: 'var(--clr-text)' }}>Your story starts here</p>
          <p className="text-sm mb-6" style={{ color: 'var(--clr-muted)' }}>Add your first milestone — when did it all begin?</p>
          <Button onClick={openNew} style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}>Add first milestone</Button>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5" style={{ background: 'var(--clr-border)' }} />
          <div className="space-y-6">
            {events.map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="flex gap-4 group"
              >
                <div className="relative z-10 shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: 'var(--clr-primary)', border: '3px solid var(--clr-bg)' }}>
                  ✨
                </div>
                <div className="flex-1 rounded-2xl p-4" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--clr-text)' }}>{event.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--clr-secondary)' }}>
                        {format(new Date(event.eventDate), 'MMMM d, yyyy')}
                        {event.location && ` · 📍 ${event.location}`}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEdit(event)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--clr-muted)' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => deleteMutation.mutate(event.id)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--clr-error)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {event.story && <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--clr-muted)' }}>{event.story}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit milestone' : 'Add a milestone'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="e.g. First date" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Location <span style={{ color: 'var(--clr-muted)' }}>(optional)</span></Label>
              <Input placeholder="Where?" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Story <span style={{ color: 'var(--clr-muted)' }}>(optional)</span></Label>
              <Textarea placeholder="Tell the story…" rows={4} value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1" style={{ borderColor: 'var(--clr-border)' }}>Cancel</Button>
              <Button
                className="flex-1"
                onClick={() => createMutation.mutate(form)}
                disabled={!form.title || !form.eventDate || createMutation.isPending}
                style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}
              >
                {createMutation.isPending ? 'Saving…' : editing ? 'Update' : 'Add milestone'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
