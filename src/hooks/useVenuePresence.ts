import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VenuePresenceEvent {
  event: 'enter' | 'exit';
  profile_id: string;
  venue_id: string;
  arrived_at?: string;
  departed_at?: string;
}

export function useVenuePresence(onEvent: (payload: VenuePresenceEvent) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('venue_presence')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'venue_stays'
      }, (payload) => {
        // Handle the realtime payload from pg_notify
        if (payload.eventType === 'INSERT') {
          onEvent({
            event: 'enter',
            profile_id: payload.new.user_id,
            venue_id: payload.new.venue_id,
            arrived_at: payload.new.arrived_at
          });
        } else if (payload.eventType === 'UPDATE' && payload.new.departed_at) {
          onEvent({
            event: 'exit',
            profile_id: payload.new.user_id,
            venue_id: payload.new.venue_id,
            departed_at: payload.new.departed_at
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onEvent]);
}