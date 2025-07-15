import { create } from 'zustand';
import { getEnvironmentConfig } from '@/lib/environment';

type PrivacyMode = 'off' | 'recs-only' | 'precise';

interface PrivacyState {
  mode: PrivacyMode;
  setMode: (m: PrivacyMode) => void;
}

export const usePrivacy = create<PrivacyState>()((set) => ({
  mode: getEnvironmentConfig().defaultPrivacyMode,
  setMode: (m) => set({ mode: m }),
}));