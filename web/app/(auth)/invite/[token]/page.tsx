'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { coupleApi } from '@/lib/api/couple';
import { useAuthStore } from '@/lib/stores/auth.store';

interface InviterPreview {
  id: string;
  displayName: string;
  avatarPublicId?: string;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [inviter, setInviter] = useState<InviterPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    coupleApi
      .getInvitePreview(token)
      .then((res) => setInviter(res.data?.inviter))
      .catch(() => setError('This invite link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!user) {
      router.push(`/register?redirect=/invite/${token}`);
      return;
    }

    setAccepting(true);
    try {
      await coupleApi.acceptInvite(token);
      toast.success("You're linked! Welcome to your shared space 💚");
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to accept invite';
      toast.error(msg);
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <Card style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
        <CardContent className="pt-8 space-y-4">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-6 w-40 mx-auto" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
        <CardContent className="pt-8 text-center">
          <p style={{ color: 'var(--clr-error)' }}>{error}</p>
          <Button className="mt-4" onClick={() => router.push('/login')} style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}>
            Go to login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
      <Card style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
        <CardHeader className="text-center">
          <Avatar className="h-20 w-20 mx-auto mb-3">
            <AvatarFallback style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)', fontSize: '1.5rem' }}>
              {inviter?.displayName?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <CardTitle>{inviter?.displayName} invited you</CardTitle>
          <CardDescription>
            Join their private space on Velora — just the two of you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full text-base h-12"
            onClick={handleAccept}
            disabled={accepting}
            style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}
          >
            {accepting ? 'Linking…' : `Accept & join ${inviter?.displayName}'s space`}
          </Button>

          {!user && (
            <p className="text-center text-sm" style={{ color: 'var(--clr-muted)' }}>
              You&apos;ll need to create an account first
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
