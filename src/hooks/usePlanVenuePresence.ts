import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type StopStatus = 'enroute' | 'arrived' | 'departed';

interface VenueStay {
  id: string;
  user_id: string;
  venue_id: string;
  arrived_at: string;
  departed_at: string | null;
  plan_id: string | null;
  stop_id: string | null;
}

export function usePlanVenuePresence(planId: string): Record<string, StopStatus> {
  const [map, setMap] = useState<Record<string, StopStatus>>({});

  useEffect(() => {
    // Clear previous state when planId changes
    setMap({});
    
    const channel = supabase
      .channel(`plan_presence_${planId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'venue_stays',
        filter: `plan_id=eq.${planId}`
      }, (payload) => {
        const row = payload.new as VenueStay;
        if (row && row.venue_id) {
          setMap(m => ({
            ...m,
            [row.venue_id]:
              row.departed_at ? 'departed'
              : row.arrived_at ? 'arrived'
              : 'enroute'
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [planId]); // planId dependency ensures cleanup on change

  return map; // { venue_id : 'arrived' | … }
}