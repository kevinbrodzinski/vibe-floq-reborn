
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { Vibe } from '@/lib/vibes';
import { isValidVibe } from '@/lib/vibes';

interface VibeState {
  currentVibe: Vibe;
  vibe: Vibe; // Add alias for backward compatibility
  visibility: 'public' | 'friends' | 'off';
  isUpdating?: boolean;
  hydrated?: boolean;
  setVibe: (vibe: Vibe) => void;
  setVisibility: (visibility: 'public' | 'friends' | 'off') => void;
  clearVibe: () => void;
}

export const useVibe = create<VibeState>()(
  persist(
    (set, get) => ({
      currentVibe: 'chill',
      get vibe() { return get().currentVibe; }, // Getter for backward compatibility
      visibility: 'public',
      isUpdating: false,
      hydrated: true,
      
      setVibe: async (vibe: Vibe) => {
        console.log('Setting vibe to:', vibe, 'type:', typeof vibe);
        
        // Validate vibe before proceeding
        if (!isValidVibe(vibe)) {
          console.error('Invalid vibe provided:', vibe);
          return;
        }
        
        set({ currentVibe: vibe, isUpdating: true });
        
        // Update in database
        try {
          const { data, error } = await supabase.rpc('set_user_vibe', {
            new_vibe: vibe
          });
          
          if (error) {
            console.error('Error updating vibe in database:', error);
            console.error('Error details:', {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
              vibe: vibe
            });
          } else {
            console.log('Vibe updated successfully:', data);
          }
        } catch (error) {
          console.error('Error calling set_user_vibe:', error);
        } finally {
          set({ isUpdating: false });
        }
      },
      
      clearVibe: async () => {
        set({ currentVibe: 'chill', isUpdating: true });
        
        try {
          const { error } = await supabase.rpc('clear_user_vibe');
          
          if (error) {
            console.error('Error clearing vibe in database:', error);
          }
        } catch (error) {
          console.error('Error calling clear_user_vibe:', error);
        } finally {
          set({ isUpdating: false });
        }
      },
      
      setVisibility: async (visibility: 'public' | 'friends' | 'off') => {
        set({ visibility });
        
        // Update presence visibility - stub for now
        console.log('Visibility updated to:', visibility);
      },
    }),
    {
      name: 'vibe-state',
    }
  )
);

// Export backward compatibility hook
export const useCurrentVibe = () => {
  const { currentVibe } = useVibe();
  return currentVibe;
};

// Export current vibe row hook (stub for compatibility)
export const useCurrentVibeRow = () => {
  const { currentVibe } = useVibe();
  return {
    vibe: currentVibe,
    started_at: new Date().toISOString(),
    profile_id: 'current-user'
  };
};
