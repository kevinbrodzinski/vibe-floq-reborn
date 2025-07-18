import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FieldTile } from './useFieldTiles';

export function useFieldDiffs(tileIds: string[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tileIds.length) return;

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 Setting up realtime subscriptions for ${tileIds.length} tiles`);
    }

    const channels = tileIds.map(id => {
      const channel = supabase
        .channel(`field:${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'field_tiles',
            filter: `tile_id=eq.${id}`
          },
          (payload) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('🔴 Field tile update:', payload);
            }
            mergeDelta(payload.new as FieldTile);
          }
        )
        .subscribe();

      return channel;
    });

    function mergeDelta(row: FieldTile) {
      queryClient.setQueriesData({ queryKey: ['fieldTiles'] }, (old: FieldTile[] = []) =>
        old.map(t => (t.tile_id === row.tile_id ? { ...t, ...row } : t))
      );
    }

    return () => {
      channels.forEach(ch => ch.unsubscribe());
    };
  }, [tileIds, queryClient]);
}