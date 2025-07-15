import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type VibeEnum = "hype" | "social" | "romantic" | "weird" | "open" | "flowing" | "down" | "solo" | "chill";

type VibeState = {
  vibe: VibeEnum | null;
  updatedAt: string | null;
  isUpdating: boolean;
  hydrated: boolean;
  setVibe: (v: VibeEnum) => Promise<void>;
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
            toast({
              variant: 'destructive',
              title: 'Could not update vibe',
              description: 'Check your connection and try again.',
            });
            // rollback
            set((s) => {
              s.vibe = null;
              s.updatedAt = null;
              s.isUpdating = false;
            });
          }
        } finally {
          set((s) => { s.isUpdating = false; });
        }
      },

      /** called by realtime subscription */
      syncFromRemote: (v, ts) => {
        // Optimize: parse local timestamp once
        const localTs = Date.parse(get().updatedAt ?? '0');
        const remoteTs = Date.parse(ts);
        
        // ignore if local change is newer (optimistic update)
        if (localTs > remoteTs) return;
        set((s) => { 
          s.vibe = v as VibeEnum; 
          s.updatedAt = ts; 
        });
      },
    })),
    { 
      name: '@vibe',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ vibe, updatedAt }) => ({ vibe, updatedAt }),
      migrate: (persisted, version) => {
        if (version < 1) {
          // add migration steps here later
        }
        return persisted as any;
      },
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);