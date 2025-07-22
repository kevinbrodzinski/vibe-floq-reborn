import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimerId } from '@/types/Timer';
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
  const updateIntervalRef = useRef<TimerId | null>(null);
  const lastSentRef = useRef<number>(0);
  const isUpdatingRef = useRef<boolean>(false);

  // Update presence function with throttling and concurrency protection
  const updatePresence = useCallback(async (
    vibe?: Vibe,
    broadcastRadius = 500
  ): Promise<PresenceResponse | null> => {
    if (!session || !location.lat || !location.lng) {
      return null;
    }

    // Throttle: prevent calls within 5 seconds of each other
    const now = Date.now();
    if (now - lastSentRef.current < 5000) {
      console.log('Throttling presence update - too soon since last call');
      return null;
    }

    // Prevent concurrent requests
    if (isUpdatingRef.current) {
      console.log('Skipping presence update - already in progress');
      return null;
    }

    const vibeToUse = vibe || presenceData.currentVibe || defaultVibe;
    
    isUpdatingRef.current = true;
    lastSentRef.current = now;
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

      // Only show toast for non-throttling errors
      if (!errorMessage.includes('throttled')) {
        toast({
          title: "Failed to update presence",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      return null;
    } finally {
      isUpdatingRef.current = false;
    }
  }, [session, location.lat, location.lng, presenceData.currentVibe, defaultVibe, toast]);

  // Set up automatic presence updates with proper cleanup
  useEffect(() => {
    if (!session || !location.lat || !location.lng) {
      return;
    }

    // Clear any existing interval before starting a new one
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    // Initial update
    updatePresence();

    // Debug: Test spatial query directly
    supabase
      .rpc('presence_nearby', { lat: location.lat, lng: location.lng, km: 1.0, include_self: true })
      .then(({ data }) => console.log('Nearby rows from DB ->', data?.length || 0));

    // Set up interval for automatic updates (reduced frequency)
    updateIntervalRef.current = setInterval(() => {
      updatePresence();
    }, 15000); // 15 seconds instead of 10

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [session, location.lat, location.lng]); // Remove updatePresence from deps to prevent recreation

  // Set up realtime subscription with throttled responses
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
          // Don't trigger immediate updates on realtime events to prevent spam
          // The interval will catch changes naturally
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
          // Don't trigger immediate updates on realtime events to prevent spam
          // The interval will catch changes naturally
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [session]); // Remove location and updatePresence dependencies

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