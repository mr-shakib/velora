'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';
import { memoriesApi } from '@/lib/api/memories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const MOOD_EMOJI: Record<string, string> = {
  HAPPY: '😊', LOVED: '🥰', CALM: '😌', TIRED: '😴',
  SAD: '😢', EXCITED: '🤩', GRATEFUL: '🙏', MISSING_YOU: '🥺',
};

export default function MemoriesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['memories', { page, search }],
    queryFn: () => memoriesApi.getAll({ page, limit: 20, search: search || undefined }),
    placeholderData: (prev) => prev,
  });

  const memories = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--clr-text)' }}>Memories</h1>
          <p className="text-sm" style={{ color: 'var(--clr-muted)' }}>
            {meta?.total ?? 0} memories together
          </p>
        </div>
        <Link href="/memories/new">
          <Button style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }} className="gap-2">
            <Plus size={16} /> Add memory
          </Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--clr-muted)' }} />
          <Input
            placeholder="Search memories…"
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ borderColor: 'var(--clr-border)' }}
          />
        </div>
        <Link href="/memories/albums">
          <Button variant="outline" style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}>
            <Filter size={16} className="mr-2" /> Albums
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
        </div>
      ) : memories.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📸</p>
          <p className="text-lg font-medium mb-1" style={{ color: 'var(--clr-text)' }}>No memories yet</p>
          <p className="text-sm mb-6" style={{ color: 'var(--clr-muted)' }}>Start capturing your moments together</p>
          <Link href="/memories/new">
            <Button style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}>Add your first memory</Button>
          </Link>
        </div>
      ) : (
        <>
          <motion.div
            layout
            className="grid grid-cols-2 md:grid-cols-3 gap-3"
          >
            <AnimatePresence>
              {memories.map((m: { id: string; media?: Array<{ url: string }>; caption?: string; memoryDate: string; mood?: string; tags?: string[] }) => (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                >
                  <Link href={`/memories/${m.id}`}>
                    <div
                      className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer"
                      style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}
                    >
                      {m.media?.[0] ? (
                        <img
                          src={m.media[0].url}
                          alt={m.caption ?? ''}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--clr-bg)' }}>
                          <span className="text-4xl">💭</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3 flex flex-col justify-end">
                        {m.caption && <p className="text-white text-xs font-medium line-clamp-2">{m.caption}</p>}
                        <p className="text-white/70 text-xs mt-0.5">{format(new Date(m.memoryDate), 'MMM d, yyyy')}</p>
                      </div>
                      {m.mood && (
                        <div className="absolute top-2 right-2 text-base">{MOOD_EMOJI[m.mood] ?? ''}</div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ borderColor: 'var(--clr-border)' }}>Previous</Button>
              <span className="flex items-center text-sm px-3" style={{ color: 'var(--clr-muted)' }}>
                {page} / {meta.totalPages}
              </span>
              <Button variant="outline" disabled={page === meta.totalPages} onClick={() => setPage((p) => p + 1)} style={{ borderColor: 'var(--clr-border)' }}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
