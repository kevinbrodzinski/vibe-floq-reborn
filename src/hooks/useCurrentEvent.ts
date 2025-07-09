import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CurrentEvent {
  id: string;
  name: string;
  vibe: string | null;
  radius_m: number;
}

interface UseCurrentEventOptions {
  onLeave?: (event: CurrentEvent) => void;
}

export const useCurrentEvent = (
  lat?: number, 
  lng?: number, 
  options?: UseCurrentEventOptions
) => {
  const [currentEvent, setCurrentEvent] = useState<CurrentEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInsideEvent, setIsInsideEvent] = useState(false);
  const previousEventRef = useRef<CurrentEvent | null>(null);

  const checkForEvents = useCallback(async () => {
    if (!lat || !lng) {
      if (previousEventRef.current) {
        options?.onLeave?.(previousEventRef.current);
        previousEventRef.current = null;
      }
      setCurrentEvent(null);
      setIsInsideEvent(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('events_containing_point', {
        user_lat: lat,
        user_lng: lng,
      });

      if (error) throw error;

      const newEvent = data && data.length > 0 ? data[0] : null;
      
      // Detect event exit
      if (previousEventRef.current && !newEvent) {
        options?.onLeave?.(previousEventRef.current);
      }
      
      setCurrentEvent(newEvent);
      setIsInsideEvent(!!newEvent);
      previousEventRef.current = newEvent;
    } catch (error) {
      console.error('Error checking for events:', error);
      setCurrentEvent(null);
      setIsInsideEvent(false);
    } finally {
      setLoading(false);
    }
  }, [lat, lng, options]);

  useEffect(() => {
    checkForEvents();
  }, [checkForEvents]);

  return { currentEvent, loading, isInsideEvent };
};