'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, MapPin, Clock, Trash2, Edit2, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface ChecklistItem { text: string; done: boolean }
interface PlannerEvent {
  id: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  category?: string;
  isConfirmed: boolean;
  checklist: ChecklistItem[];
  author: { id: string; displayName: string };
}

const CATEGORIES = ['Date', 'Trip', 'Family', 'Friends', 'Special', 'Other'];
const CAT_COLORS: Record<string, string> = {
  Date: '#F0B4C3', Trip: '#A8D5BA', Family: '#F9E4B7',
  Friends: '#C3B4F0', Special: '#F4C2A1', Other: '#B4D4F0',
};

const emptyForm = { title: '', description: '', startsAt: '', endsAt: '', location: '', category: '', checklist: '' };

export default function PlannerPage() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlannerEvent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  const { data, isLoading } = useQuery({
    queryKey: ['planner'],
    queryFn: () => apiClient.get('/planner').then((r) => r.data?.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiClient.post('/planner', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['planner', 'upcoming'] });
      setOpen(false);
      toast.success('Date added!');
    },
    onError: () => toast.error('Failed to save'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: Record<string, unknown>) => apiClient.patch(`/planner/${id}`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      setOpen(false);
      toast.success('Updated!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/planner/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      toast.success('Removed');
    },
  });

  function openNew(date?: Date) {
    setEditing(null);
    setForm({ ...emptyForm, startsAt: date ? format(date, "yyyy-MM-dd'T'HH:mm") : '' });
    setOpen(true);
  }

  function openEdit(e: PlannerEvent) {
    setEditing(e);
    setForm({
      title: e.title,
      description: e.description ?? '',
      startsAt: e.startsAt.slice(0, 16),
      endsAt: e.endsAt?.slice(0, 16) ?? '',
      location: e.location ?? '',
      category: e.category ?? '',
      checklist: e.checklist.map((c) => c.text).join('\n'),
    });
    setOpen(true);
  }

  function submit() {
    const payload = {
      title: form.title,
      description: form.description || undefined,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
      location: form.location || undefined,
      category: form.category || undefined,
      checklist: form.checklist
        ? form.checklist.split('\n').filter(Boolean).map((t) => ({ text: t.trim(), done: false }))
        : [],
    };
    if (editing) updateMutation.mutate({ id: editing.id, ...payload });
    else createMutation.mutate(payload);
  }

  const events: PlannerEvent[] = data ?? [];
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startWeekday = startOfMonth(currentMonth).getDay();

  function eventsOnDay(day: Date) {
    return events.filter((e) => isSameDay(new Date(e.startsAt), day));
  }

  const selectedDayEvents = selectedDay ? eventsOnDay(selectedDay) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--clr-text)' }}>Date Planner</h1>
          <p className="text-sm" style={{ color: 'var(--clr-muted)' }}>{events.length} plans together</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--clr-bg)' }}>
            {(['calendar', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1 text-xs rounded-md capitalize font-medium transition-all"
                style={{
                  background: view === v ? 'var(--clr-surface)' : 'transparent',
                  color: view === v ? 'var(--clr-text)' : 'var(--clr-muted)',
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <Button onClick={() => openNew()} style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }} className="gap-1.5">
            <Plus size={15} /> Add date
          </Button>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="grid md:grid-cols-[1fr_280px] gap-4">
          {/* Calendar */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--clr-border)' }}>
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:opacity-70">
                <ChevronLeft size={18} style={{ color: 'var(--clr-text)' }} />
              </button>
              <span className="font-semibold" style={{ color: 'var(--clr-text)' }}>{format(currentMonth, 'MMMM yyyy')}</span>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:opacity-70">
                <ChevronRight size={18} style={{ color: 'var(--clr-text)' }} />
              </button>
            </div>

            <div className="p-3">
              <div className="grid grid-cols-7 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div key={d} className="text-center text-xs py-1 font-medium" style={{ color: 'var(--clr-muted)' }}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startWeekday }).map((_, i) => <div key={`empty-${i}`} />)}
                {days.map((day) => {
                  const dayEvents = eventsOnDay(day);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                      className="aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all"
                      style={{
                        background: isSelected ? 'var(--clr-primary)' : isToday(day) ? 'var(--clr-bg)' : 'transparent',
                        color: isSelected ? 'var(--clr-text)' : !isSameMonth(day, currentMonth) ? 'var(--clr-muted)' : 'var(--clr-text)',
                        border: isToday(day) && !isSelected ? '1px solid var(--clr-primary)' : '1px solid transparent',
                      }}
                    >
                      <span className="text-xs font-medium">{format(day, 'd')}</span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((e, i) => (
                            <div key={i} className="w-1 h-1 rounded-full" style={{ background: CAT_COLORS[e.category ?? ''] ?? 'var(--clr-secondary)' }} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Day panel */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
            {selectedDay ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm" style={{ color: 'var(--clr-text)' }}>{format(selectedDay, 'EEEE, MMM d')}</p>
                  <button onClick={() => openNew(selectedDay)} className="p-1 rounded-lg hover:opacity-70">
                    <Plus size={14} style={{ color: 'var(--clr-secondary)' }} />
                  </button>
                </div>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: 'var(--clr-muted)' }}>No plans — add one?</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents.map((e) => (
                      <EventCard key={e.id} event={e} onEdit={() => openEdit(e)} onDelete={() => deleteMutation.mutate(e.id)} compact />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-center py-6" style={{ color: 'var(--clr-muted)' }}>Select a day to see plans</p>
            )}
          </div>
        </div>
      ) : (
        /* List view */
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
          ) : events.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-medium" style={{ color: 'var(--clr-text)' }}>No dates planned yet</p>
              <p className="text-sm mt-1 mb-4" style={{ color: 'var(--clr-muted)' }}>Plan something special together</p>
              <Button onClick={() => openNew()} style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}>Add your first date</Button>
            </div>
          ) : (
            <AnimatePresence>
              {[...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()).map((e) => (
                <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <EventCard event={e} onEdit={() => openEdit(e)} onDelete={() => deleteMutation.mutate(e.id)} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit plan' : 'Plan a date'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="e.g. Picnic in the park" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Starts at</Label>
                <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Ends at <span style={{ color: 'var(--clr-muted)' }}>(opt)</span></Label>
                <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input placeholder="Where?" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm({ ...form, category: form.category === cat ? '' : cat })}
                    className="text-xs px-2.5 py-1 rounded-full transition-all"
                    style={{
                      background: form.category === cat ? CAT_COLORS[cat] : 'var(--clr-bg)',
                      color: 'var(--clr-text)',
                      border: `1px solid ${form.category === cat ? CAT_COLORS[cat] : 'var(--clr-border)'}`,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Any details…" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Checklist <span style={{ color: 'var(--clr-muted)' }}>(one item per line)</span></Label>
              <Textarea placeholder="Book restaurant&#10;Buy flowers&#10;Charge camera" rows={3} value={form.checklist} onChange={(e) => setForm({ ...form, checklist: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1" style={{ borderColor: 'var(--clr-border)' }}>Cancel</Button>
              <Button
                className="flex-1"
                onClick={submit}
                disabled={!form.title || !form.startsAt || createMutation.isPending || updateMutation.isPending}
                style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving…' : editing ? 'Update' : 'Add plan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventCard({ event, onEdit, onDelete, compact = false }: { event: PlannerEvent; onEdit: () => void; onDelete: () => void; compact?: boolean }) {
  const doneTasks = event.checklist.filter((c) => c.done).length;
  return (
    <div className="rounded-xl p-3 group" style={{ background: compact ? 'var(--clr-bg)' : 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {event.category && (
            <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: CAT_COLORS[event.category] ?? 'var(--clr-secondary)' }} />
          )}
          <div className="min-w-0">
            <p className="font-medium text-sm truncate" style={{ color: 'var(--clr-text)' }}>{event.title}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--clr-secondary)' }}>
                <Clock size={10} /> {format(new Date(event.startsAt), 'MMM d · h:mm a')}
              </span>
              {event.location && (
                <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--clr-muted)' }}>
                  <MapPin size={10} /> {event.location}
                </span>
              )}
            </div>
            {event.checklist.length > 0 && (
              <span className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: 'var(--clr-muted)' }}>
                <CheckSquare size={10} /> {doneTasks}/{event.checklist.length} tasks
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--clr-muted)' }}><Edit2 size={12} /></button>
          <button onClick={onDelete} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--clr-error, #e57373)' }}><Trash2 size={12} /></button>
        </div>
      </div>
    </div>
  );
}
