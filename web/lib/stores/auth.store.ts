'use client';
import { create } from 'zustand';
import { setAccessToken } from '../api/client';

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarPublicId?: string;
  coupleId?: string;
  status: string;
  aiConsentGiven: boolean;
  timezone: string;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setToken: (token) => setAccessToken(token),
  clearSession: () => {
    setAccessToken(null);
    set({ user: null, isLoading: false });
  },
}));
