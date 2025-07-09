import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useGeolocation } from './useGeolocation';
import type { Vibe, NearbyUser, WalkableFloq } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceData {
  nearby_users: NearbyUser[];
  walkable_floqs: WalkableFloq[];
  currentVibe: Vibe | null;
  updating: boolean;
  error: string | null;
}

interface PresenceResponse {
  status: string;
  nearby_users: NearbyUser[];
  walkable_floqs: WalkableFloq[];
}

export const useEnhancedPresence = (defaultVibe: Vibe = 'social') => {
  const [presenceData, setPresenceData] = useState<PresenceData>({
    nearby_users: [],
    walkable_floqs: [],
    currentVibe: defaultVibe,
    updating: false,
    error: null,
  });
  
  const { session } = useAuth();
  const { toast } = useToast();
  const location = useGeolocation();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update presence function
  const updatePresence = useCallback(async (
    vibe?: Vibe,
    broadcastRadius = 500
  ): Promise<PresenceResponse | null> => {
    if (!session || !location.lat || !location.lng) {
      return null;
    }

    const vibeToUse = vibe || presenceData.currentVibe || defaultVibe;
    
    setPresenceData(prev => ({ ...prev, updating: true, error: null }));
    
    try {
      const { data, error } = await supabase.functions.invoke('upsert-presence', {
        body: {
          vibe: vibeToUse,
          lat: location.lat,
          lng: location.lng,
          broadcast_radius: broadcastRadius,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to update presence');
      }

      const response = data as PresenceResponse;
      
      setPresenceData(prev => ({
        ...prev,
        nearby_users: response.nearby_users || [],
        walkable_floqs: response.walkable_floqs || [],
        currentVibe: vibeToUse,
        updating: false,
      }));

      return response;
    } catch (error: any) {
      console.error('Presence update error:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      
      setPresenceData(prev => ({
        ...prev,
        updating: false,
        error: errorMessage,
      }));

      toast({
        title: "Failed to update presence",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    }
  }, [session, location.lat, location.lng, presenceData.currentVibe, defaultVibe, toast]);

  // Set up automatic presence updates every 10 seconds
  useEffect(() => {
    if (!session || !location.lat || !location.lng) {
      return;
    }

    // Initial update
    updatePresence();

    // Set up interval for automatic updates
    updateIntervalRef.current = setInterval(() => {
      updatePresence();
    }, 10000); // 10 seconds

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [session, location.lat, location.lng, updatePresence]);

  // Set up realtime subscription for presence changes
  useEffect(() => {
    if (!session) {
      return;
    }

    // Create realtime channel for presence updates
    channelRef.current = supabase
      .channel('presence-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vibes_now'
        },
        (payload) => {
          console.log('Presence update received:', payload);
          // Refresh nearby users when presence changes
          if (location.lat && location.lng) {
            updatePresence();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'floqs'
        },
        (payload) => {
          console.log('Floq update received:', payload);
          // Refresh walkable floqs when floqs change
          if (location.lat && location.lng) {
            updatePresence();
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [session, location.lat, location.lng, updatePresence]);

  // Manual vibe change function
  const changeVibe = useCallback((newVibe: Vibe) => {
    setPresenceData(prev => ({ ...prev, currentVibe: newVibe }));
    updatePresence(newVibe);
  }, [updatePresence]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    ...presenceData,
    location,
    updatePresence,
    changeVibe,
    isLocationReady: !location.loading && location.lat !== null && location.lng !== null,
  };
};