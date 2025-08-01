import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VibeScreenState {
  mode: 'personal' | 'social';
  setMode: (m: 'personal' | 'social') => void;
}

/** Local store for the mode toggle with persistence */
export const useVibeScreenMode = create<VibeScreenState>()(
  persist(
    (set) => ({
      mode: 'social', // Start with social mode as default
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'vibe-screen-mode', // localStorage key
    }
  )
);