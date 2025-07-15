import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

type VibeState = {
  vibe: string | null;
  updatedAt: string | null;
  isUpdating: boolean;
  setVibe: (v: string) => Promise<void>;
  syncFromRemote: (v: string, ts: string) => void;
};

export const useVibe = create<VibeState>()(
  persist(
    immer((set, get) => ({
      vibe: null,
      updatedAt: null,
      isUpdating: false,

      /** optimistic setter → rolls back on error */
      setVibe: async (newVibe) => {
        const ts = new Date().toISOString();
        set({ vibe: newVibe, updatedAt: ts, isUpdating: true });

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

        set({ isUpdating: false });
      },

      /** called by realtime subscription */
      syncFromRemote: (v, ts) => {
        // ignore if local change is newer (optimistic update)
        if (get().updatedAt && get().updatedAt! > ts) return;
        set({ vibe: v, updatedAt: ts });
      },
    })),
    { name: '@vibe' } // AsyncStorage key
  )
);