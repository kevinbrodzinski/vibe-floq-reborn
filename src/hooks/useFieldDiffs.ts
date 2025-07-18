import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFieldDiffs(tileIds: string[]) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!tileIds.length) return;

    // Subscribe to postgres_changes for field_tiles table
    const channel = supabase
      .channel('field_tiles_changes')
      .on('presence', { event: 'sync' }, () => {
        // No-op to silence presence handler warning
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'field_tiles',
        },
        (payload) => {
          // Filter client-side to only handle tiles in current viewport
          const tileId = payload.new?.tile_id || payload.old?.tile_id;
          if (!tileIds.includes(tileId)) return;

          // Update both fieldTilesCache and current fieldTiles query
          const updateTileData = (old: any[] = []) => {
            const m = new Map(old.map(t => [t.tile_id, t]));
            
            // Set tile first to avoid missing new keys before diff updates
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              m.set(payload.new.tile_id, payload.new);
            }
            
            switch (payload.eventType) {
              case 'INSERT':
              case 'UPDATE':
                break; // Already handled above
              case 'DELETE':
                m.delete(payload.old.tile_id);
                break;
            }
            
            return [...m.values()];
          };

          qc.setQueriesData({ queryKey: ['fieldTilesCache'] }, updateTileData);
          qc.setQueriesData({ queryKey: ['fieldTiles'] }, updateTileData);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tileIds.join('|')]);
}