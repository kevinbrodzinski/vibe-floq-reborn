import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type StayEvent =
  | { type:'stay_insert'; id:number; user_id:string; venue_id:string; arrived_at:string; plan_id?:string|null; stop_id?:string|null }
  | { type:'stay_depart'; id:number; user_id:string; venue_id:string; departed_at:string; plan_id?:string|null; stop_id?:string|null };

export function useVenueStaysChannel(
  onEvent:(e:StayEvent)=>void
){
  useEffect(()=>{
    const ch = supabase.channel('venue_stays_frontend')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'venue_stays'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          onEvent({
            type: 'stay_insert',
            id: payload.new.id,
            user_id: payload.new.user_id,
            venue_id: payload.new.venue_id,
            arrived_at: payload.new.arrived_at,
            plan_id: payload.new.plan_id,
            stop_id: payload.new.stop_id
          });
        } else if (payload.eventType === 'UPDATE' && payload.new.departed_at) {
          onEvent({
            type: 'stay_depart',
            id: payload.new.id,
            user_id: payload.new.user_id,
            venue_id: payload.new.venue_id,
            departed_at: payload.new.departed_at,
            plan_id: payload.new.plan_id,
            stop_id: payload.new.stop_id
          });
        }
      })
      .subscribe();

    return ()=>{ supabase.removeChannel(ch); };
  },[onEvent]);
}