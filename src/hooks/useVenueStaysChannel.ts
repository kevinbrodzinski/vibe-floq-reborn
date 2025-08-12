import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type StayEvent =
  | { type: 'stay_insert'; id: number; profile_id: string | null; venue_id: string; arrived_at: string; plan_id?: string | null; stop_id?: string | null }
  | { type: 'stay_depart'; id: number; profile_id: string | null; venue_id: string; departed_at: string; plan_id?: string | null; stop_id?: string | null };

export function useVenueStaysChannel(onEvent: (e: StayEvent) => void) {
  useEffect(() => {
    const ch = supabase
      .channel('venue_stays_frontend')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'venue_stays' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            onEvent({
              type: 'stay_insert',
              id: payload.new.id,
              profile_id: payload.new.profile_id,
              venue_id: payload.new.venue_id,
              arrived_at: payload.new.arrived_at,
              plan_id: (payload.new as any).plan_id ?? null,
              stop_id: (payload.new as any).stop_id ?? null,
            });
          } else if (
            payload.eventType === 'UPDATE' &&
            payload.new.departed_at &&
            !payload.old?.departed_at
          ) {
            onEvent({
              type: 'stay_depart',
              id: payload.new.id,
              profile_id: payload.new.profile_id,
              venue_id: payload.new.venue_id,
              departed_at: payload.new.departed_at,
              plan_id: (payload.new as any).plan_id ?? null,
              stop_id: (payload.new as any).stop_id ?? null,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [onEvent]);
}