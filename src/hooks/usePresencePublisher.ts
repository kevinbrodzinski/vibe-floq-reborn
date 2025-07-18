import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export function usePresencePublisher(enabled = true) {
  const { session } = useAuth();

  useEffect(() => {
    if (!enabled || !session) return;

    let watchId: number | null = null;

    const startWatching = () => {
      watchId = navigator.geolocation.watchPosition(
        async ({ coords }) => {
          const lat = coords.latitude;
          const lng = coords.longitude;
          const vibe = 'chill'; // TODO: pull from UI/state

          try {
            await supabase.rpc('upsert_presence', { 
              p_lat: lat, 
              p_lng: lng, 
              p_vibe: vibe 
            });
          } catch (error) {
            console.error('Failed to update presence:', error);
          }
        },
        (error) => console.error('Geolocation error:', error),
        { 
          maximumAge: 5_000, 
          enableHighAccuracy: true,
          timeout: 10_000
        }
      );
    };

    startWatching();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [enabled, session]);
}