import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useRippleQueue(tileIds: string[], push: (tileId: string, delta: number) => void) {
  useEffect(() => {
    if (!tileIds.length) return;

    const ch = supabase
      .channel(`field_tiles_ripple_${Date.now()}_${Math.random().toString(36)}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'field_tiles',
          filter: `tile_id=in.(${tileIds.join(',')})`,
        },
        ({ new: r, old }) => {
          const delta = r.crowd_count - (old?.crowd_count || 0);
          if (Math.abs(delta) >= 10) {
            push(r.tile_id, delta);
          }
        },
      )
      .subscribe();

    return () => ch.unsubscribe();
  }, [tileIds.join(','), push]);
}