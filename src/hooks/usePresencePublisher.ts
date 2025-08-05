import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { globalLocationManager } from '@/lib/location/GlobalLocationManager';
import { publishPresence } from '@/lib/presence/publishPresence';
import { trackError } from '@/lib/trackError';
import { useCurrentUser } from '@/hooks/useCurrentUser';

type Vibe = 'social' | 'chill' | 'focused' | 'energetic' | 'open' | 'curious';

interface UsePresencePublisherOptions {
  interval?: number;
  accuracy?: 'high' | 'medium' | 'low';
  enableBackground?: boolean;
}

export function usePresencePublisher(
  vibe: Vibe,
  isActive: boolean = true,
  options: UsePresencePublisherOptions = {}
) {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const { data: user } = useCurrentUser();

  const updatePosition = useCallback(async (position: GeolocationPosition) => {
    if (!user || !isActive) return;

    try {
      setIsPublishing(true);
      setError(null);

      // Simple presence update to prevent infinite loops
      await publishPresence(position);
      setLastUpdate(new Date());
      
    } catch (err: any) {
      console.error('Error publishing presence:', err);
      setError(err.message);
      trackError(err, { context: 'presence_publisher' });
    } finally {
      setIsPublishing(false);
    }
  }, [user, isActive]);

  useEffect(() => {
    if (!user || !isActive) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    try {
      // Use global location manager to prevent infinite loops
      unsubscribeRef.current = globalLocationManager.subscribe(
        `presence-publisher-${user.id}`,
        (coords) => {
          // Create valid GeolocationPosition object
          const position: GeolocationPosition = {
            coords: {
              latitude: coords.lat,
              longitude: coords.lng,
              accuracy: coords.accuracy || 50,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: function() { return this; }
            },
            timestamp: Date.now(),
            toJSON: function() { return this; }
          };
          
          // Defer execution to prevent infinite loops
          requestAnimationFrame(() => {
            updatePosition(position);
          });
        },
        (error) => {
          console.error('Location error:', error);
          setError(error.message);
        }
      );

    } catch (err: any) {
      console.error('Error setting up location subscription:', err);
      setError(err.message);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isActive, user?.id, updatePosition]);

  // Set user vibe state
  useEffect(() => {
    if (!user || !vibe) return;

    const setUserVibe = async () => {
      try {
        const { error: vibeError } = await supabase.rpc('set_user_vibe', {
          p_vibe: vibe
        });
        
        if (vibeError) {
          console.error('Error setting user vibe:', vibeError);
        }
      } catch (err) {
        console.error('Error calling set_user_vibe:', err);
      }
    };

    setUserVibe();
  }, [user?.id, vibe]);

  const forceUpdate = useCallback(() => {
    if (!user) return;
    
    globalLocationManager.getCurrentLocation()
      .then(updatePosition)
      .catch((err) => {
        console.error('Error getting current location:', err);
        setError(err.message);
      });
  }, [updatePosition, user]);

  return {
    isPublishing,
    lastUpdate,
    error,
    forceUpdate,
    isActive
  };
}