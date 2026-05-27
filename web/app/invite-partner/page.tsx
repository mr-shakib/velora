'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Copy, Check, Link2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { coupleApi } from '@/lib/api/couple';

export default function InvitePartnerPage() {
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['invite-link'],
    queryFn: () => coupleApi.createInvite().then((r) => r.data),
  });

  const inviteUrl = data?.token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${data.token}`
    : '';

  async function copyLink() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--clr-bg)' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3 animate-float">💌</div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--clr-secondary)' }}>Invite your partner</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--clr-muted)' }}>Share this link with the one you love</p>
        </div>

        <Card style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
          <CardHeader>
            <CardTitle>Your invite link</CardTitle>
            <CardDescription>Valid for 7 days · One-time use</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="h-12 rounded-xl skeleton-shimmer" />
            ) : (
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-sm break-all"
                style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)', color: 'var(--clr-muted)' }}
              >
                <Link2 size={16} className="shrink-0" />
                <span className="flex-1 truncate">{inviteUrl}</span>
              </div>
            )}

            <Button
              className="w-full gap-2"
              onClick={copyLink}
              disabled={!inviteUrl || isLoading}
              style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy invite link'}
            </Button>

            <div className="text-center">
              <a
                href={`/dashboard`}
                className="inline-flex items-center gap-1 text-sm hover:underline"
                style={{ color: 'var(--clr-muted)' }}
              >
                Skip for now <ArrowRight size={14} />
              </a>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
