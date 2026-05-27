'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { differenceInDays, format, formatDistanceToNow } from 'date-fns';
import { Heart, Calendar, Image, Target, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useSocketStore } from '@/lib/stores/socket.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const MOOD_EMOJI: Record<string, string> = {
  HAPPY: '😊', LOVED: '🥰', CALM: '😌', TIRED: '😴',
  SAD: '😢', EXCITED: '🤩', GRATEFUL: '🙏', MISSING_YOU: '🥺',
};

function TogetherCounter({ start }: { start: string }) {
  const days = differenceInDays(new Date(), new Date(start));
  return (
    <Card className="col-span-2" style={{ background: 'var(--clr-primary)', border: 'none' }}>
      <CardContent className="pt-6 pb-5 text-center">
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--clr-secondary)' }}>Together for</p>
        <p className="text-6xl font-bold tracking-tight" style={{ color: 'var(--clr-text)' }}>{days}</p>
        <p className="text-lg mt-1" style={{ color: 'var(--clr-secondary)' }}>days</p>
        <p className="text-xs mt-3" style={{ color: 'var(--clr-secondary)' }}>
          Since {format(new Date(start), 'MMMM d, yyyy')}
        </p>
      </CardContent>
    </Card>
  );
}

function MoodCard({ mood, name }: { mood: string; name: string }) {
  return (
    <Card style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
      <CardContent className="pt-4 pb-4 text-center">
        <p className="text-3xl">{MOOD_EMOJI[mood] ?? '💭'}</p>
        <p className="text-xs mt-2 font-medium" style={{ color: 'var(--clr-text)' }}>{name}</p>
        <p className="text-xs" style={{ color: 'var(--clr-muted)' }}>is feeling</p>
        <p className="text-xs font-medium capitalize mt-0.5" style={{ color: 'var(--clr-secondary)' }}>
          {mood.replace('_', ' ').toLowerCase()}
        </p>
      </CardContent>
    </Card>
  );
}

function CountdownCard({ label, targetAt, emoji }: { label: string; targetAt: string; emoji?: string }) {
  const dist = formatDistanceToNow(new Date(targetAt), { addSuffix: true });
  const days = differenceInDays(new Date(targetAt), new Date());
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: 'var(--clr-border)' }}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{emoji ?? '🗓️'}</span>
        <span className="text-sm font-medium" style={{ color: 'var(--clr-text)' }}>{label}</span>
      </div>
      <Badge style={{ background: 'var(--clr-bg)', color: 'var(--clr-secondary)', border: '1px solid var(--clr-border)' }}>
        {days >= 0 ? `${days}d` : dist}
      </Badge>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { partnerMood } = useSocketStore();

  const { data: couple, isLoading: coupleLoading } = useQuery({
    queryKey: ['couple'],
    queryFn: () => apiClient.get('/couple/me').then((r) => r.data?.data),
    enabled: !!user?.coupleId,
  });

  const { data: recentMemories } = useQuery({
    queryKey: ['memories', { limit: 4 }],
    queryFn: () => apiClient.get('/memories', { params: { limit: 4 } }).then((r) => r.data?.data),
    enabled: !!user?.coupleId,
  });

  const { data: upcomingPlans } = useQuery({
    queryKey: ['planner', 'upcoming'],
    queryFn: () => apiClient.get('/planner/upcoming', { params: { days: 14 } }).then((r) => r.data?.data),
    enabled: !!user?.coupleId,
  });

  const { data: bucketStats } = useQuery({
    queryKey: ['bucket', 'stats'],
    queryFn: () => apiClient.get('/bucket/stats').then((r) => r.data?.data),
    enabled: !!user?.coupleId,
  });

  const { data: countdowns } = useQuery({
    queryKey: ['countdowns'],
    queryFn: () => apiClient.get('/countdowns').then((r) => r.data?.data),
    enabled: !!user?.coupleId,
    staleTime: 60_000,
  });

  const { data: partnerData } = useQuery({
    queryKey: ['partner'],
    queryFn: () => apiClient.get('/users/me/partner').then((r) => r.data?.data),
    enabled: !!user?.coupleId,
    staleTime: 5 * 60 * 1000,
  });

  const partner = partnerData;

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--clr-text)' }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.displayName} 👋
        </h1>
      </motion.div>

      {/* Stats grid */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {coupleLoading ? (
          <>
            <Skeleton className="col-span-2 h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </>
        ) : couple ? (
          <>
            <TogetherCounter start={couple.relationshipStart} />
            {user && <MoodCard mood="HAPPY" name="Your mood" />}
            {partner && partnerMood && <MoodCard mood={partnerMood.mood} name={partner.displayName} />}
          </>
        ) : null}
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Memories */}
        <motion.div variants={item}>
          <Card style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Image size={16} style={{ color: 'var(--clr-primary)' }} /> Recent memories
              </CardTitle>
              <Link href="/memories" className="text-xs hover:underline flex items-center gap-1" style={{ color: 'var(--clr-secondary)' }}>
                View all <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <CardContent>
              {!recentMemories?.length ? (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">📸</p>
                  <p className="text-sm" style={{ color: 'var(--clr-muted)' }}>No memories yet — add your first one!</p>
                  <Link href="/memories/new">
                    <Badge className="mt-3 cursor-pointer" style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}>
                      Add memory
                    </Badge>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {recentMemories.map((m: { id: string; media?: Array<{ url: string }>; caption?: string; memoryDate: string }) => (
                    <Link key={m.id} href={`/memories/${m.id}`}>
                      <div className="aspect-square rounded-xl overflow-hidden relative" style={{ background: 'var(--clr-bg)' }}>
                        {m.media?.[0] ? (
                          <img src={m.media[0].url} alt={m.caption ?? ''} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">💭</div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Plans */}
        <motion.div variants={item} className="space-y-4">
          <Card style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar size={16} style={{ color: 'var(--clr-primary)' }} /> Upcoming dates
              </CardTitle>
              <Link href="/planner" className="text-xs hover:underline flex items-center gap-1" style={{ color: 'var(--clr-secondary)' }}>
                View all <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <CardContent>
              {!upcomingPlans?.length ? (
                <div className="text-center py-6">
                  <p className="text-2xl mb-2">📅</p>
                  <p className="text-sm" style={{ color: 'var(--clr-muted)' }}>No upcoming dates planned</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {upcomingPlans.slice(0, 3).map((p: { id: string; title: string; startsAt: string; location?: string }) => (
                    <div key={p.id} className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: 'var(--clr-border)' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--clr-text)' }}>{p.title}</p>
                        {p.location && <p className="text-xs" style={{ color: 'var(--clr-muted)' }}>📍 {p.location}</p>}
                      </div>
                      <p className="text-xs shrink-0 ml-2" style={{ color: 'var(--clr-secondary)' }}>
                        {format(new Date(p.startsAt), 'MMM d')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bucket Progress */}
          {bucketStats && (
            <Card style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target size={16} style={{ color: 'var(--clr-primary)' }} /> Bucket list progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5" style={{ background: 'var(--clr-border)' }}>
                    <div
                      className="h-2.5 rounded-full transition-all"
                      style={{
                        width: bucketStats.total ? `${(bucketStats.completed / bucketStats.total) * 100}%` : '0%',
                        background: 'var(--clr-primary)',
                      }}
                    />
                  </div>
                  <span className="text-sm shrink-0" style={{ color: 'var(--clr-secondary)' }}>
                    {bucketStats.completed}/{bucketStats.total}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Countdowns */}
          {countdowns?.length > 0 && (
            <Card style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart size={16} style={{ color: 'var(--clr-primary)' }} /> Countdowns
                </CardTitle>
              </CardHeader>
              <CardContent>
                {countdowns.slice(0, 3).map((c: { id: string; label: string; targetAt: string; emoji?: string }) => (
                  <CountdownCard key={c.id} label={c.label} targetAt={c.targetAt} emoji={c.emoji} />
                ))}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
