'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotifPrefs {
  memoriesCreated: boolean;
  bucketCompleted: boolean;
  anniversaries: boolean;
  planReminders: boolean;
  partnerMood: boolean;
}

const PREFS_KEY = 'velora:notif-prefs';
const DEFAULT_PREFS: NotifPrefs = {
  memoriesCreated: true,
  bucketCompleted: true,
  anniversaries: true,
  planReminders: true,
  partnerMood: false,
};

const PREFS_META: Array<{ key: keyof NotifPrefs; label: string; description: string; emoji: string }> = [
  { key: 'memoriesCreated', label: 'New memories', description: 'When your partner adds a memory', emoji: '📸' },
  { key: 'bucketCompleted', label: 'Bucket list', description: 'When an item gets completed', emoji: '✅' },
  { key: 'anniversaries', label: 'Anniversaries', description: 'Relationship anniversaries and birthdays', emoji: '💑' },
  { key: 'planReminders', label: 'Date reminders', description: '24 hours before a planned date', emoji: '📅' },
  { key: 'partnerMood', label: 'Mood updates', description: "When your partner's mood changes", emoji: '💭' },
];

export default function NotificationsSettingsPage() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [pushGranted, setPushGranted] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) {
      try { setPrefs(JSON.parse(stored)); } catch { /* ignore */ }
    }
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setPushSupported(supported);
    if (supported) setPushGranted(Notification.permission === 'granted');
  }, []);

  function toggle(key: keyof NotifPrefs) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  }

  async function requestPushPermission() {
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        setPushGranted(true);
        toast.success('Push notifications enabled!');
      } else {
        toast.error('Permission denied — check your browser settings');
      }
    } catch {
      toast.error('Push notifications not supported');
    }
  }

  return (
    <div className="space-y-6">
      {/* In-app notifications */}
      <div className="rounded-2xl p-5 space-y-1" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
        <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--clr-text)' }}>In-app notifications</h2>
        {PREFS_META.map(({ key, label, description, emoji }) => (
          <div
            key={key}
            className="flex items-center justify-between py-3 border-b last:border-0"
            style={{ borderColor: 'var(--clr-border)' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{emoji}</span>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--clr-text)' }}>{label}</p>
                <p className="text-xs" style={{ color: 'var(--clr-muted)' }}>{description}</p>
              </div>
            </div>
            <button
              onClick={() => toggle(key)}
              className="relative w-10 h-5 rounded-full transition-all"
              style={{ background: prefs[key] ? 'var(--clr-primary)' : 'var(--clr-border)' }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm"
                style={{ left: prefs[key] ? '1.375rem' : '0.125rem' }}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Push notifications */}
      {pushSupported && (
        <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--clr-text)' }}>Push notifications</h2>
          <p className="text-xs" style={{ color: 'var(--clr-muted)' }}>
            Get notified even when Velora is closed. Works on supported browsers.
          </p>
          {pushGranted ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--clr-secondary)' }}>
              <Bell size={15} /> Push notifications are enabled
            </div>
          ) : (
            <Button onClick={requestPushPermission} style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }} className="gap-2">
              <Bell size={15} /> Enable push notifications
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
