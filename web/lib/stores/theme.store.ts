'use client';
import { create } from 'zustand';

export interface ThemeColors {
  preset: string;
  bg: string;
  surface: string;
  primary: string;
  primaryDim: string;
  secondary: string;
  text: string;
  muted: string;
  border: string;
}

export const THEME_PRESETS: Record<string, ThemeColors> = {
  'cream-mint': {
    preset: 'cream-mint',
    bg: '#F8F4EC', surface: '#FFFFFF',
    primary: '#A8D5BA', primaryDim: '#8EC4A6',
    secondary: '#5C7A6B', text: '#2B2B2B',
    muted: '#8C8C8C', border: '#E5E0D8',
  },
  'cream-sage': {
    preset: 'cream-sage',
    bg: '#F5F2EB', surface: '#FAFAF7',
    primary: '#8FAF96', primaryDim: '#7A9980',
    secondary: '#4A6B55', text: '#2B2B2B',
    muted: '#8C8C8C', border: '#E0DBD0',
  },
  'dark-forest': {
    preset: 'dark-forest',
    bg: '#1A2420', surface: '#232E2A',
    primary: '#4A8C6A', primaryDim: '#3D7559',
    secondary: '#A8D5BA', text: '#F0EDE8',
    muted: '#7A9080', border: '#2D3E38',
  },
};

interface ThemeStore {
  colors: ThemeColors;
  applyTheme: (colors: Partial<ThemeColors>) => void;
  applyPreset: (presetId: string) => void;
}

function injectCssVars(colors: Partial<ThemeColors>) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (colors.bg) root.style.setProperty('--clr-bg', colors.bg);
  if (colors.surface) root.style.setProperty('--clr-surface', colors.surface);
  if (colors.primary) root.style.setProperty('--clr-primary', colors.primary);
  if (colors.primaryDim) root.style.setProperty('--clr-primary-dim', colors.primaryDim);
  if (colors.secondary) root.style.setProperty('--clr-secondary', colors.secondary);
  if (colors.text) root.style.setProperty('--clr-text', colors.text);
  if (colors.muted) root.style.setProperty('--clr-muted', colors.muted);
  if (colors.border) root.style.setProperty('--clr-border', colors.border);
}

export const useThemeStore = create<ThemeStore>((set) => ({
  colors: THEME_PRESETS['cream-mint'],
  applyTheme: (colors) => {
    injectCssVars(colors);
    set((state) => ({ colors: { ...state.colors, ...colors } }));
    try {
      localStorage.setItem('velora:theme', JSON.stringify(colors));
    } catch { /* ignore */ }
  },
  applyPreset: (presetId) => {
    const preset = THEME_PRESETS[presetId];
    if (!preset) return;
    injectCssVars(preset);
    set({ colors: preset });
    try {
      localStorage.setItem('velora:theme', JSON.stringify(preset));
    } catch { /* ignore */ }
  },
}));
