import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CurrentEvent {
  id: string;
  name: string;
  vibe: string | null;
  radius_m: number;
}

export const useCurrentEvent = (lat?: number, lng?: number) => {
  const [currentEvent, setCurrentEvent] = useState<CurrentEvent | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lat || !lng) {
      setCurrentEvent(null);
      return;
    }

    const checkForEvents = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('events_containing_point', {
          user_lat: lat,
          user_lng: lng,
        });

        if (error) throw error;

        // Take the first event if multiple exist
        setCurrentEvent(data && data.length > 0 ? data[0] : null);
      } catch (error) {
        console.error('Error checking for events:', error);
        setCurrentEvent(null);
      } finally {
        setLoading(false);
      }
    };

    checkForEvents();
  }, [lat, lng]);

  return { currentEvent, loading };
};