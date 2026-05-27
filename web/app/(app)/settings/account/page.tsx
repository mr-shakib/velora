'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const profileSchema = z.object({
  displayName: z.string().min(2).max(50),
  timezone: z.string(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/\d/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

const TIMEZONES = Intl.supportedValuesOf('timeZone');

export default function AccountPage() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: user?.displayName ?? '', timezone: user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone },
  });

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const profileMutation = useMutation({
    mutationFn: (d: ProfileForm) => apiClient.patch('/users/me', d).then((r) => r.data?.data),
    onSuccess: (data) => {
      if (data) setUser(data);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile updated!');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const passwordMutation = useMutation({
    mutationFn: (d: PasswordForm) => apiClient.patch('/users/me/password', { currentPassword: d.currentPassword, newPassword: d.newPassword }),
    onSuccess: () => {
      toast.success('Password changed!');
      passwordForm.reset();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to change password');
    },
  });

  return (
    <div className="space-y-6">
      {/* Profile */}
      <form
        onSubmit={profileForm.handleSubmit((d) => profileMutation.mutate(d))}
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}
      >
        <h2 className="font-semibold text-sm" style={{ color: 'var(--clr-text)' }}>Profile</h2>

        <div className="space-y-1.5">
          <Label>Display name</Label>
          <Input {...profileForm.register('displayName')} />
          {profileForm.formState.errors.displayName && (
            <p className="text-xs" style={{ color: 'var(--clr-error, #e57373)' }}>{profileForm.formState.errors.displayName.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={user?.email ?? ''} disabled style={{ opacity: 0.6 }} />
        </div>

        <div className="space-y-1.5">
          <Label>Timezone</Label>
          <select
            {...profileForm.register('timezone')}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--clr-bg)', color: 'var(--clr-text)', border: '1px solid var(--clr-border)' }}
          >
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>

        <Button type="submit" disabled={profileMutation.isPending} style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}>
          {profileMutation.isPending ? 'Saving…' : 'Save profile'}
        </Button>
      </form>

      {/* Password */}
      <form
        onSubmit={passwordForm.handleSubmit((d) => passwordMutation.mutate(d))}
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}
      >
        <h2 className="font-semibold text-sm" style={{ color: 'var(--clr-text)' }}>Change password</h2>

        <div className="space-y-1.5">
          <Label>Current password</Label>
          <div className="relative">
            <Input type={showCurrentPw ? 'text' : 'password'} {...passwordForm.register('currentPassword')} />
            <button type="button" onClick={() => setShowCurrentPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showCurrentPw ? <EyeOff size={15} style={{ color: 'var(--clr-muted)' }} /> : <Eye size={15} style={{ color: 'var(--clr-muted)' }} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>New password</Label>
          <div className="relative">
            <Input type={showNewPw ? 'text' : 'password'} {...passwordForm.register('newPassword')} />
            <button type="button" onClick={() => setShowNewPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showNewPw ? <EyeOff size={15} style={{ color: 'var(--clr-muted)' }} /> : <Eye size={15} style={{ color: 'var(--clr-muted)' }} />}
            </button>
          </div>
          {passwordForm.formState.errors.newPassword && (
            <p className="text-xs" style={{ color: 'var(--clr-error, #e57373)' }}>{passwordForm.formState.errors.newPassword.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Confirm new password</Label>
          <Input type="password" {...passwordForm.register('confirmPassword')} />
          {passwordForm.formState.errors.confirmPassword && (
            <p className="text-xs" style={{ color: 'var(--clr-error, #e57373)' }}>{passwordForm.formState.errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" disabled={passwordMutation.isPending} variant="outline" style={{ borderColor: 'var(--clr-border)' }}>
          {passwordMutation.isPending ? 'Changing…' : 'Change password'}
        </Button>
      </form>
    </div>
  );
}
