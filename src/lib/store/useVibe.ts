import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/integrations/supabase/client';

type VibeState = {
  vibe: string | null;
  updatedAt: string | null;
  isUpdating: boolean;
  hydrated: boolean;
  setVibe: (v: string) => Promise<void>;
  syncFromRemote: (v: string, ts: string) => void;
};

// Selector helper to avoid repeating everywhere
export const useCurrentVibe = () => useVibe((s) => s.vibe);

export const useVibe = create<VibeState>()(
  persist(
    immer((set, get) => ({
      vibe: null,
      updatedAt: null,
      isUpdating: false,
      hydrated: false,

      /** optimistic setter → rolls back on error */
      setVibe: async (newVibe) => {
        const ts = new Date().toISOString();
        set((s) => { 
          s.vibe = newVibe; 
          s.updatedAt = ts; 
          s.isUpdating = true; 
        });

        try {
          const { error } = await supabase.rpc('set_user_vibe', {
            new_vibe: newVibe,
          });

          if (error) {
            console.error('set_user_vibe failed', error);
            // rollback
            set((s) => {
              s.vibe = null;
              s.updatedAt = null;
            });
          }
        } finally {
          set((s) => { s.isUpdating = false; });
        }
      },

      /** called by realtime subscription */
      syncFromRemote: (v, ts) => {
        // ignore if local change is newer (optimistic update)
        if (get().updatedAt && Date.parse(get().updatedAt) > Date.parse(ts)) return;
        set((s) => { 
          s.vibe = v; 
          s.updatedAt = ts; 
        });
      },
    })),
    { 
      name: '@vibe',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ vibe, updatedAt }) => ({ vibe, updatedAt }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);