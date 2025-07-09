import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
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
    enabled: typeof lat === 'number' && typeof lng === 'number',
  });

  // Handle event detection
  useEffect(() => {
    if (query.data && onDismiss) {
      onDismiss();
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