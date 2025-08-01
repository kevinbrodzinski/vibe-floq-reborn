import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      name: 'vibe-screen-mode',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);