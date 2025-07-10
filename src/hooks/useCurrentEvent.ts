import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CurrentEvent {
  id: string;
  name: string;
  vibe: string | null;
  radius_m: number;
}

export function useCurrentEvent(
  lat?: number,
  lng?: number,
  onDismiss?: () => void
) {
  // Prevent recursive calls by tracking if we've already fired the callback
  const onceRef = useRef(false);
  const query = useQuery<CurrentEvent | null>({
    queryKey: ['current-event', lat, lng],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('events_containing_point', {
        user_lat: lat!,
        user_lng: lng!,
      });

      if (error) throw error;
      
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
  });

  // Handle event detection - moved callback outside to prevent recursive loops
  // Use onceRef to prevent recursive state updates
  useEffect(() => {
    if (query.data && onDismiss && !onceRef.current) {
      onceRef.current = true;
      onDismiss();
    }
    // Reset flag when event changes
    if (!query.data) {
      onceRef.current = false;
    }
  }, [query.data, onDismiss]);

  // Handle errors
  useEffect(() => {
    if (query.error) {
      console.error('Error checking for events:', query.error);
    }
  }, [query.error]);

  return query;
}