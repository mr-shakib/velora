'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth.store';

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';
  const { setUser, setToken } = useAuthStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const res = await authApi.verifyEmail({ email, code });
      setToken(res.data.accessToken);
      setUser(res.data.user);
      toast.success('Email verified!');
      router.push('/setup-profile');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid code';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await authApi.resendOtp(email);
      toast.success('New code sent!');
      setCountdown(60);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to resend';
      toast.error(msg);
    } finally {
      setResending(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest font-mono h-14"
              style={{ borderColor: 'var(--clr-border)' }}
            />

            <Button type="submit" className="w-full" disabled={loading || code.length !== 6} style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}>
              {loading ? 'Verifying…' : 'Verify email'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || countdown > 0}
                className="text-sm hover:underline disabled:opacity-50"
                style={{ color: 'var(--clr-secondary)' }}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : resending ? 'Sending…' : 'Resend code'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
