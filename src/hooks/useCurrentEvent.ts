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
  // onceRef guard to prevent recursive glitch
  const onceRef = useRef<string | null>(null);
  
  const query = useQuery<CurrentEvent | null>({
    queryKey: ['current-event', lat, lng],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('events_containing_point', {
        user_lat: lat!,
        user_lng: lng!,
      });

      if (error) throw error;
      const arr = Array.isArray(data) ? (data as any[]) : [];
      return arr.length > 0 ? (arr[0] as any) : null;
    },
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
  });

  // Handle event detection with guard to prevent recursive calls
  useEffect(() => {
    if (query.data?.id && onDismiss && onceRef.current !== query.data.id) {
      onceRef.current = query.data.id;
      onDismiss();
    }
  }, [query.data?.id]); // Remove onDismiss from deps to prevent loop

  // Handle errors
  useEffect(() => {
    if (query.error) {
      console.error('Error checking for events:', query.error);
    }
  }, [query.error]);

  return query;
}