'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth.store';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      setToken(res.data.accessToken);
      setUser(res.data.user);

      if (!res.data.user.coupleId) {
        router.push('/invite-partner');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to your shared space</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register('email')}
                style={{ borderColor: errors.email ? 'var(--clr-error)' : 'var(--clr-border)' }}
              />
              {errors.email && <p className="text-xs" style={{ color: 'var(--clr-error)' }}>{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password')}
                style={{ borderColor: errors.password ? 'var(--clr-error)' : 'var(--clr-border)' }}
              />
              {errors.password && <p className="text-xs" style={{ color: 'var(--clr-error)' }}>{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>

            <p className="text-center text-sm" style={{ color: 'var(--clr-muted)' }}>
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium hover:underline" style={{ color: 'var(--clr-secondary)' }}>
                Create one
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
