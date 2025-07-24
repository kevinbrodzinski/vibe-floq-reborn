import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type StopStatus = 'enroute' | 'arrived' | 'departed';

export function usePlanVenuePresence(planId: string) {
  const [map, setMap] = useState<Record<string, StopStatus>>({});

  useEffect(() => {
    const channel = supabase
      .channel(`plan_presence_${planId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'venue_stays',
        filter: `plan_id=eq.${planId}`
      }, (payload) => {
        const row = payload.new as any;
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
  }, [planId]);

  return map; // { venue_id : 'arrived' | … }
}