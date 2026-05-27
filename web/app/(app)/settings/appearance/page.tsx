'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { useThemeStore, THEME_PRESETS, ThemeColors } from '@/lib/stores/theme.store';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const PRESET_META: Record<string, { label: string; description: string }> = {
  'cream-mint': { label: 'Cream & Mint', description: 'Soft warm tones with fresh mint accents' },
  'cream-sage': { label: 'Cream & Sage', description: 'Earthy neutrals with muted sage greens' },
  'dark-forest': { label: 'Dark Forest', description: 'Deep forest greens for late-night browsing' },
};

const COLOR_FIELDS: Array<{ key: keyof ThemeColors; label: string }> = [
  { key: 'bg', label: 'Background' },
  { key: 'surface', label: 'Surface' },
  { key: 'primary', label: 'Primary accent' },
  { key: 'secondary', label: 'Secondary accent' },
  { key: 'text', label: 'Text' },
  { key: 'muted', label: 'Muted text' },
  { key: 'border', label: 'Border' },
];

export default function AppearancePage() {
  const { colors, applyPreset, applyTheme } = useThemeStore();
  const [customColors, setCustomColors] = useState<Partial<ThemeColors>>({});
  const [isDirty, setIsDirty] = useState(false);

  const { data: themeData } = useQuery({
    queryKey: ['theme'],
    queryFn: () => apiClient.get('/theme').then((r) => r.data?.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<ThemeColors>) => apiClient.put('/theme', data),
    onSuccess: () => {
      toast.success('Theme saved for both of you!');
      setIsDirty(false);
      setCustomColors({});
    },
    onError: () => toast.error('Failed to save theme'),
  });

  function selectPreset(presetId: string) {
    applyPreset(presetId);
    setCustomColors({});
    setIsDirty(true);
  }

  function updateColor(key: keyof ThemeColors, value: string) {
    const updated = { ...customColors, [key]: value };
    setCustomColors(updated);
    applyTheme({ [key]: value });
    setIsDirty(true);
  }

  function save() {
    const merged = { ...colors, ...customColors };
    saveMutation.mutate(merged);
  }

  const currentPreset = colors.preset;

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'var(--clr-text)' }}>Theme presets</h2>
        <div className="space-y-2">
          {Object.entries(THEME_PRESETS).map(([id, preset]) => (
            <button
              key={id}
              onClick={() => selectPreset(id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
              style={{
                background: currentPreset === id ? 'var(--clr-bg)' : 'transparent',
                border: `1px solid ${currentPreset === id ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
              }}
            >
              {/* Color swatch strip */}
              <div className="flex gap-1 shrink-0">
                {[preset.bg, preset.primary, preset.secondary, preset.text].map((c, i) => (
                  <div key={i} className="w-4 h-8 rounded-md" style={{ background: c, border: '1px solid rgba(0,0,0,0.08)' }} />
                ))}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--clr-text)' }}>{PRESET_META[id].label}</p>
                <p className="text-xs" style={{ color: 'var(--clr-muted)' }}>{PRESET_META[id].description}</p>
              </div>
              {currentPreset === id && <Check size={15} style={{ color: 'var(--clr-primary)' }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Custom colors */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
        <div>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--clr-text)' }}>Custom colors</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--clr-muted)' }}>Fine-tune individual colors — synced live with your partner</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={(customColors[key] ?? colors[key]) as string}
                onChange={(e) => updateColor(key, e.target.value)}
                className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0.5"
                style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)' }}
              />
              <div>
                <Label className="text-xs">{label}</Label>
                <p className="text-[10px] font-mono" style={{ color: 'var(--clr-muted)' }}>
                  {(customColors[key] ?? colors[key]) as string}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <Button
        onClick={save}
        disabled={!isDirty || saveMutation.isPending}
        className="w-full"
        style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}
      >
        {saveMutation.isPending ? 'Saving…' : 'Save theme for both of us'}
      </Button>
    </div>
  );
}
