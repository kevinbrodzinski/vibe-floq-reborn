import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supaFn } from '@/lib/supaFn';
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No auth session");
      
      const res = await supaFn('upsert-presence', session.access_token, {
        vibe,
        lat,
        lng,
        broadcast_radius: broadcastRadius,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      const data = await res.json();
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