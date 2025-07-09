import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import type { Vibe, NearbyUser, WalkableFloq } from '@/types';

interface PresenceResponse {
  status: string;
  nearby_users: NearbyUser[];
  walkable_floqs: WalkableFloq[];
}

export const usePresence = () => {
  const [updating, setUpdating] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();

  const updatePresence = useCallback(async (
    vibe: Vibe,
    lat: number,
    lng: number,
    broadcastRadius = 500
  ): Promise<PresenceResponse | null> => {
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign in to update your presence",
        variant: "destructive",
      });
      return null;
    }

    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('upsert-presence', {
        body: {
          vibe,
          lat,
          lng,
          broadcast_radius: broadcastRadius,
        },
      });

      if (error) throw error;

      return data as PresenceResponse;
    } catch (error: any) {
      console.error('Presence update error:', error);
      toast({
        title: "Failed to update presence",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUpdating(false);
    }
  }, [session, toast]);

  return {
    updatePresence,
    updating,
  };
};