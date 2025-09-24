import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VibeScreenState {
  mode: 'personal' | 'social';
  setMode: (m: 'personal' | 'social') => void;
}

// Safe storage wrapper that handles unavailable storage
const createSafeStorage = () => {
  if (typeof window === 'undefined') return undefined;
  
  try {
    // Test if localStorage is available
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return undefined; // Use default localStorage
  } catch {
    // localStorage is not available, return a no-op storage
    return createJSONStorage(() => ({
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }));
  }
};

/** Local store for the mode toggle with persistence */
export const useVibeScreenMode = create<VibeScreenState>()(
  persist(
    (set) => ({
      mode: 'personal', // Start with personal mode as default - core vibe functionality
      setMode: (mode) => {
        console.log('Setting vibe screen mode to:', mode);
        set({ mode });
      },
    }),
    {
      name: 'vibe-screen-mode',
      storage: Platform.select({
        web: createSafeStorage(),
        default: createJSONStorage(() => AsyncStorage),
      }),
      // Add error handling for persistence failures
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('Failed to rehydrate vibe screen mode:', error);
        } else {
          console.log('Vibe screen mode rehydrated:', state?.mode);
        }
      },
    }
  )
);