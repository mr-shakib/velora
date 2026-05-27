'use client';
import { create } from 'zustand';

interface SocketStore {
  connected: boolean;
  partnerOnline: boolean;
  partnerMood: { mood: string; note?: string } | null;
  setConnected: (connected: boolean) => void;
  setPartnerOnline: (online: boolean) => void;
  setPartnerMood: (mood: { mood: string; note?: string } | null) => void;
}

export const useSocketStore = create<SocketStore>((set) => ({
  connected: false,
  partnerOnline: false,
  partnerMood: null,
  setConnected: (connected) => set({ connected }),
  setPartnerOnline: (partnerOnline) => set({ partnerOnline }),
  setPartnerMood: (partnerMood) => set({ partnerMood }),
}));
