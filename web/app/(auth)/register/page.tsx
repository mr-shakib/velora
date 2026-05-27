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

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9]/, 'Must include at least one number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await authApi.register({ email: data.email, password: data.password, displayName: data.displayName });
      toast.success('Account created! Check your email for a verification code.');
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
        <CardHeader>
          <CardTitle>Create your space</CardTitle>
          <CardDescription>Join Velora — invite your partner after signing up</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Your name</Label>
              <Input id="displayName" placeholder="How should we call you?" {...register('displayName')} />
              {errors.displayName && <p className="text-xs" style={{ color: 'var(--clr-error)' }}>{errors.displayName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-xs" style={{ color: 'var(--clr-error)' }}>{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" {...register('password')} />
              {errors.password && <p className="text-xs" style={{ color: 'var(--clr-error)' }}>{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input id="confirmPassword" type="password" placeholder="Repeat your password" autoComplete="new-password" {...register('confirmPassword')} />
              {errors.confirmPassword && <p className="text-xs" style={{ color: 'var(--clr-error)' }}>{errors.confirmPassword.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading} style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>

            <p className="text-center text-sm" style={{ color: 'var(--clr-muted)' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-medium hover:underline" style={{ color: 'var(--clr-secondary)' }}>
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
