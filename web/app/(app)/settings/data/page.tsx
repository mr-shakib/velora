'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, AlertTriangle, Unlink, Shield } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function DataPage() {
  const { user, clearSession } = useAuthStore();
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const exportMutation = useMutation({
    mutationFn: () => apiClient.get('/couple/export', { responseType: 'blob' }),
    onSuccess: (response) => {
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `velora-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded!');
    },
    onError: () => toast.error('Export failed'),
  });

  const unlinkMutation = useMutation({
    mutationFn: () => apiClient.post('/couple/unlink/request'),
    onSuccess: () => {
      toast.success('Unlink request sent. Your partner must confirm to proceed.');
      setUnlinkOpen(false);
      setConfirmText('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to send request');
    },
  });

  const aiConsentMutation = useMutation({
    mutationFn: (consent: boolean) => apiClient.patch('/users/me/ai-consent', { consent }),
    onSuccess: (_, consent) => toast.success(consent ? 'AI features enabled' : 'AI features disabled'),
    onError: () => toast.error('Failed to update AI consent'),
  });

  const CONFIRM_PHRASE = 'unlink our account';

  return (
    <div className="space-y-6">
      {/* AI Consent */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
        <div className="flex items-center gap-2">
          <Shield size={15} style={{ color: 'var(--clr-secondary)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--clr-text)' }}>AI features</h2>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--clr-muted)' }}>
          AI features (caption suggestions, date ideas, monthly recaps) process your memory captions and location data.
          Your names and contact information are never sent to the AI. You can revoke consent at any time.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => aiConsentMutation.mutate(true)}
            disabled={aiConsentMutation.isPending}
            style={{ borderColor: 'var(--clr-primary)', color: 'var(--clr-secondary)' }}
          >
            Enable AI
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => aiConsentMutation.mutate(false)}
            disabled={aiConsentMutation.isPending}
            style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-muted)' }}
          >
            Disable AI
          </Button>
        </div>
      </div>

      {/* Export data */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
        <div className="flex items-center gap-2">
          <Download size={15} style={{ color: 'var(--clr-secondary)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--clr-text)' }}>Export your data</h2>
        </div>
        <p className="text-xs" style={{ color: 'var(--clr-muted)' }}>
          Download all your memories, timeline events, plans, and messages in JSON format.
        </p>
        <Button
          variant="outline"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
          className="gap-2"
          style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
        >
          <Download size={15} />
          {exportMutation.isPending ? 'Preparing export…' : 'Download my data'}
        </Button>
      </div>

      {/* Unlink account */}
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-error, #e57373)' }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} style={{ color: 'var(--clr-error, #e57373)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--clr-error, #e57373)' }}>Danger zone</h2>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--clr-muted)' }}>
          Requesting to unlink your accounts requires your partner to also confirm. After both parties agree,
          a 30-day grace period begins before all shared data is permanently deleted.
        </p>
        <Button
          variant="outline"
          onClick={() => setUnlinkOpen(true)}
          className="gap-2"
          style={{ borderColor: 'var(--clr-error, #e57373)', color: 'var(--clr-error, #e57373)' }}
        >
          <Unlink size={15} /> Request account unlink
        </Button>
      </div>

      {/* Unlink confirm dialog */}
      <Dialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
        <DialogContent style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} style={{ color: 'var(--clr-error, #e57373)' }} />
              Request account unlink
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-xl p-4 text-sm space-y-2" style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)' }}>
              <p style={{ color: 'var(--clr-text)' }}>This will:</p>
              <ul className="space-y-1 list-disc list-inside" style={{ color: 'var(--clr-muted)' }}>
                <li>Send an unlink request to your partner</li>
                <li>Require their confirmation to proceed</li>
                <li>Start a 30-day grace period before data deletion</li>
                <li>Permanently delete all shared memories, chats, and plans</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <Label>
                Type <span className="font-mono font-semibold" style={{ color: 'var(--clr-text)' }}>"{CONFIRM_PHRASE}"</span> to confirm
              </Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                style={{ borderColor: 'var(--clr-error, #e57373)' }}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setUnlinkOpen(false); setConfirmText(''); }} className="flex-1" style={{ borderColor: 'var(--clr-border)' }}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={confirmText !== CONFIRM_PHRASE || unlinkMutation.isPending}
                onClick={() => unlinkMutation.mutate()}
                style={{ background: 'var(--clr-error, #e57373)', color: '#fff' }}
              >
                {unlinkMutation.isPending ? 'Sending request…' : 'Send unlink request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
