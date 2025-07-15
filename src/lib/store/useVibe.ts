import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { VibeEnum } from '@/constants/vibes';

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

          const { error } = await supabase.rpc('set_user_vibe', {
            new_vibe: newVibe,
            lat: lat,     // explicitly pass null if no location
            lng: lng      // explicitly pass null if no location
          });

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

// Enable DevTools in development
if (process.env.NODE_ENV === 'development') {
  import('zustand/middleware').then(({ devtools }) => {
    // Re-create store with devtools for debugging
    console.log('Zustand DevTools enabled for vibe store');
  });
}