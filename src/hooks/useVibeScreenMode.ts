import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VibeScreenState {
  mode: 'personal' | 'social';
  setMode: (m: 'personal' | 'social') => void;
}

/** Local store for the mode toggle with persistence */
export const useVibeScreenMode = create<VibeScreenState>()(
  persist(
    (set) => ({
      mode: 'personal', // Start with personal mode as default - core vibe functionality
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'vibe-screen-mode',
      storage: Platform.select({
        web: undefined, // falls back to localStorage
        default: createJSONStorage(() => AsyncStorage),
      }),
    }
  )
);