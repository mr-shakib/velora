'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth.store';

const schema = z.object({
  displayName: z.string().min(2).max(50),
  bio: z.string().max(300).optional(),
  birthday: z.string().optional(),
  timezone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function SetupProfilePage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: user?.displayName, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await apiClient.patch('/users/me', data);
      setUser(res.data.data);
      toast.success('Profile saved!');
      router.push('/invite-partner');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--clr-bg)' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--clr-secondary)' }}>Welcome to Velora</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--clr-muted)' }}>Tell us a bit about yourself</p>
        </div>
        <Card style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
            <CardDescription>This is how your partner will see you</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Display name</Label>
                <Input placeholder="Your name" {...register('displayName')} />
                {errors.displayName && <p className="text-xs" style={{ color: 'var(--clr-error)' }}>{errors.displayName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Short bio <span style={{ color: 'var(--clr-muted)' }}>(optional)</span></Label>
                <Textarea placeholder="A little something about you…" rows={3} {...register('bio')} />
              </div>
              <div className="space-y-1.5">
                <Label>Birthday <span style={{ color: 'var(--clr-muted)' }}>(optional)</span></Label>
                <Input type="date" {...register('birthday')} />
              </div>
              <Button type="submit" className="w-full" disabled={loading} style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}>
                {loading ? 'Saving…' : 'Continue'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
