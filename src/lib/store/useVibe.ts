
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { Vibe } from '@/lib/vibes';

interface VibeState {
  currentVibe: Vibe;
  vibe: Vibe; // Add alias for backward compatibility
  visibility: 'public' | 'friends' | 'off';
  setVibe: (vibe: Vibe) => void;
  setVisibility: (visibility: 'public' | 'friends' | 'off') => void;
}

export const useVibe = create<VibeState>()(
  persist(
    (set, get) => ({
      currentVibe: 'chill',
      get vibe() { return get().currentVibe; }, // Getter for backward compatibility
      visibility: 'public',
      
      setVibe: async (vibe: Vibe) => {
        set({ currentVibe: vibe });
        
        // Update in database
        try {
          const { error } = await supabase.rpc('set_user_vibe', {
            new_vibe: vibe
          });
          
          if (error) {
            console.error('Error updating vibe in database:', error);
          }
        } catch (error) {
          console.error('Error calling set_user_vibe:', error);
        }
      },
      
      setVisibility: async (visibility: 'public' | 'friends' | 'off') => {
        set({ visibility });
        
        // Update presence visibility if needed
        try {
          if (visibility !== 'off') {
            const { error } = await supabase.rpc('update_presence_visibility', {
              new_visibility: visibility
            });
            
            if (error) {
              console.error('Error updating visibility in database:', error);
            }
          }
        } catch (error) {
          console.error('Error updating visibility:', error);
        }
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
