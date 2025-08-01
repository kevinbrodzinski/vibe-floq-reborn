import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentVibe } from '@/lib/store/useVibe';

export const useVenueJoin = () => {
  const { toast } = useToast();
  const currentVibe = useCurrentVibe();

  const checkInToVenue = useCallback(async (venueId: string, lat?: number, lng?: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('User not authenticated');

      // Record venue presence for afterglow generation
      const { error: presenceError } = await supabase
        .from('venue_live_presence')
        .upsert({
          venue_id: venueId,
          vibe: currentVibe || 'social', // Required field
          checked_in_at: new Date().toISOString(),
          last_heartbeat: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours
        }, {
          onConflict: 'venue_id'
        });

      if (presenceError) {
        console.error('Failed to record venue presence:', presenceError);
        // Continue with check-in even if presence recording fails
      }

      console.log('Successfully checked in to venue:', venueId);
      
      toast({
        title: "Checked In!",
        description: "You've checked in to this venue.",
      });
      
      return { success: true };
    } catch (error) {
      console.error('Check-in error:', error);
      toast({
        title: "Error",
        description: "Failed to check in. Please try again.",
        variant: "destructive",
      });
      return { success: false, error };
    }
  }, [toast]);

  return { checkInToVenue };
};