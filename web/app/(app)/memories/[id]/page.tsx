'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Tag, Edit2, Trash2, Lock, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { memoriesApi } from '@/lib/api/memories';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const MOOD_EMOJI: Record<string, string> = {
  HAPPY: '😊', LOVED: '🥰', CALM: '😌', TIRED: '😴',
  SAD: '😢', EXCITED: '🤩', GRATEFUL: '🙏', MISSING_YOU: '🥺',
};
const MOOD_LABEL: Record<string, string> = {
  HAPPY: 'Happy', LOVED: 'Loved', CALM: 'Calm', TIRED: 'Tired',
  SAD: 'Sad', EXCITED: 'Excited', GRATEFUL: 'Grateful', MISSING_YOU: 'Missing you',
};

interface Memory {
  id: string;
  caption?: string;
  memoryDate: string;
  location?: string;
  city?: string;
  country?: string;
  mood?: string;
  tags?: string[];
  isPrivate: boolean;
  media: Array<{ url: string; mediaType: string; publicId: string }>;
  author: { id: string; displayName: string };
}

export default function MemoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeMedia, setActiveMedia] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['memory', id],
    queryFn: () => memoriesApi.getOne(id).then((r) => r?.data),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => memoriesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      toast.success('Memory removed');
      router.push('/memories');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const memory: Memory | undefined = data;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32 rounded-xl" />
        <Skeleton className="aspect-square rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-4xl mb-4">😕</p>
        <p className="font-medium" style={{ color: 'var(--clr-text)' }}>Memory not found</p>
        <button onClick={() => router.back()} className="mt-4 text-sm hover:underline" style={{ color: 'var(--clr-secondary)' }}>Go back</button>
      </div>
    );
  }

  const isOwner = memory.author.id === user?.id;
  const locationStr = [memory.city, memory.country].filter(Boolean).join(', ') || memory.location;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity"
          style={{ color: 'var(--clr-secondary)' }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        {isOwner && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/memories/${id}/edit`)}
              className="gap-1.5"
              style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-muted)' }}
            >
              <Edit2 size={13} /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Remove this memory?')) deleteMutation.mutate();
              }}
              className="gap-1.5"
              style={{ borderColor: 'var(--clr-error, #e57373)', color: 'var(--clr-error, #e57373)' }}
            >
              <Trash2 size={13} /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* Media gallery */}
      {memory.media.length > 0 && (
        <div className="space-y-2">
          <motion.div
            key={activeMedia}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="aspect-video rounded-2xl overflow-hidden"
            style={{ background: 'var(--clr-bg)' }}
          >
            {memory.media[activeMedia].mediaType === 'VIDEO' ? (
              <video
                src={memory.media[activeMedia].url}
                controls
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                src={memory.media[activeMedia].url}
                alt={memory.caption ?? ''}
                className="w-full h-full object-contain"
              />
            )}
          </motion.div>
          {memory.media.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {memory.media.map((m, i) => (
                <button
                  key={m.publicId}
                  onClick={() => setActiveMedia(i)}
                  className="shrink-0 w-16 h-16 rounded-xl overflow-hidden transition-all"
                  style={{
                    border: `2px solid ${i === activeMedia ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
                  }}
                >
                  {m.mediaType === 'VIDEO' ? (
                    <div className="w-full h-full flex items-center justify-center text-xl" style={{ background: 'var(--clr-bg)' }}>🎬</div>
                  ) : (
                    <img src={m.url} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {memory.media.length === 0 && (
        <div className="aspect-video rounded-2xl flex items-center justify-center text-6xl" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
          💭
        </div>
      )}

      {/* Details */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold" style={{ color: 'var(--clr-text)' }}>
              {format(new Date(memory.memoryDate), 'MMMM d, yyyy')}
            </p>
            <p className="text-sm" style={{ color: 'var(--clr-muted)' }}>
              by {isOwner ? 'you' : memory.author.displayName}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {memory.mood && (
              <span className="text-2xl" title={MOOD_LABEL[memory.mood]}>{MOOD_EMOJI[memory.mood]}</span>
            )}
            {memory.isPrivate && (
              <div className="p-1.5 rounded-lg" style={{ background: 'var(--clr-bg)' }} title="Private memory">
                <Lock size={14} style={{ color: 'var(--clr-muted)' }} />
              </div>
            )}
          </div>
        </div>

        {memory.caption && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>{memory.caption}</p>
        )}

        {locationStr && (
          <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--clr-secondary)' }}>
            <MapPin size={14} />
            <span>{locationStr}</span>
          </div>
        )}

        {memory.tags && memory.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag size={13} style={{ color: 'var(--clr-muted)' }} />
            {memory.tags.map((tag) => (
              <Badge
                key={tag}
                style={{ background: 'var(--clr-bg)', color: 'var(--clr-secondary)', border: '1px solid var(--clr-border)' }}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
