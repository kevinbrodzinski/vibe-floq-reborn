
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { rtChannel } from '@/lib/rtChannel';

/**
 * Listens for crowd-count surges on the supplied tile IDs
 * and calls `push(tileId, delta)` whenever |Δcrowd| ≥ 10.
 */
export default function useRippleQueue(
  tileIds: string[],
  push: (tileId: string, delta: number) => void,
) {

  useEffect(() => {
    if (!tileIds?.length) return;

    const channel = rtChannel(
      supabase,
      `field_tiles_ripple_${Date.now()}`
    )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'field_tiles',
          filter: `tile_id=in.(${tileIds.join(',')})`,
        },
        ({ new: r, old }) => {
          if (!r) return;
          const delta =
            (r.crowd_count as number) - ((old?.crowd_count as number) ?? 0);
          if (Math.abs(delta) >= 10) push(r.tile_id as string, delta);
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [tileIds?.join(','), push]);
}
