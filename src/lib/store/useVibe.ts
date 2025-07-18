import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { VibeEnum } from '@/constants/vibes';

type VibeState = {
  vibe: VibeEnum | null;
  visibility: 'public' | 'friends' | 'off';
  updatedAt: string | null;
  isUpdating: boolean;
  hydrated: boolean;
  currentRow: any | null; // Store the full vibe row with started_at
  setVibe: (v: VibeEnum) => Promise<void>;
  setVisibility: (v: 'public' | 'friends' | 'off') => void;  
  clearVibe: () => Promise<void>;
  syncFromRemote: (v: string, ts: string) => void;
  setCurrentRow: (row: any) => void;
};

// Selector helpers to avoid repeating everywhere
export const useCurrentVibe = () => useVibe((s) => s.vibe);
export const useCurrentVibeRow = () => useVibe((s) => s.currentRow);

export const useVibe = create<VibeState>()(
  persist(
    immer((set, get) => ({
      vibe: null,
      visibility: 'public' as const,
      updatedAt: null,
      isUpdating: false,
      hydrated: false,
      currentRow: null,

      /** optimistic setter → rolls back on error */
      setVibe: async (newVibe) => {
        const ts = new Date().toISOString();
        set((s) => { 
          s.vibe = newVibe; 
          s.updatedAt = ts; 
          s.isUpdating = true; 
        });

        try {
          // Get current location if available
          let lat: number | null = null;
          let lng: number | null = null;
          
          if (navigator.geolocation) {
            try {
              const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  timeout: 5000,
                  maximumAge: 60000 // Use cached position up to 1 minute old
                });
              });
              lat = position.coords.latitude;
              lng = position.coords.longitude;
            } catch (geoError) {
              console.log('Could not get location, setting vibe without location');
              // lat and lng remain null
            }
          }

          const { data, error } = await supabase
            .rpc('set_user_vibe', {
              new_vibe: newVibe,
              lat: lat,     // explicitly pass null if no location
              lng: lng      // explicitly pass null if no location
            })
            .single();

          if (error) {
            console.error('set_user_vibe failed', error);
            toast({
              variant: 'destructive',
              title: 'Could not update vibe',
              description: 'Check your connection and try again.',
              duration: 4000,
            });
            // rollback
            set((s) => {
              s.vibe = null;
              s.updatedAt = null;
              s.isUpdating = false;
            });
          } else if (data) {
            // Use the returned row directly - no second query needed
            set((s) => {
              s.currentRow = data as any;
              s.vibe = (data as any)?.vibe_tag;
              s.updatedAt = (data as any)?.started_at;
            });
          }
        } finally {
          set((s) => { s.isUpdating = false; });
        }
      },

      /** set visibility */
      setVisibility: (visibility) => {
        set((s) => { s.visibility = visibility; });
      },

      /** clear vibe functionality */
      clearVibe: async () => {
        try {
          const { error } = await supabase.rpc('clear_user_vibe');
          if (error) {
            console.error('clear_user_vibe failed', error);
            toast({
              variant: 'destructive',
              title: 'Could not clear vibe',
              description: 'Check your connection and try again.',
              duration: 4000,
            });
          } else {
            set((s) => {
              s.vibe = null;
              s.updatedAt = null;
              s.currentRow = null;
            });
            toast({
              title: 'Vibe cleared',
              description: 'Your vibe has been cleared successfully.',
              duration: 2000,
            });
          }
        } catch (error) {
          console.error('Error clearing vibe:', error);
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

      /** set current row data */
      setCurrentRow: (row) => {
        set((s) => {
          s.currentRow = row;
          if (row) {
            s.vibe = row.vibe_tag;
            s.updatedAt = row.started_at;
          }
        });
      },
    })),
    { 
      name: '@vibe-v2',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ vibe: s.vibe, visibility: s.visibility, updatedAt: s.updatedAt }),
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

// Enable DevTools in development
if (process.env.NODE_ENV === 'development') {
  import('zustand/middleware').then(({ devtools }) => {
    // Re-create store with devtools for debugging
    console.log('Zustand DevTools enabled for vibe store');
  });
}