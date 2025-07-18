import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFieldDiffs(tileIds: string[]) {
  const qc = useQueryClient();

  useEffect(() => {
    const subs = tileIds.map(id =>
      supabase.channel(`field:${id}`)
        .on('broadcast', { event: 'tile_update' }, ({ payload }) =>
          qc.setQueriesData({ queryKey: ['fieldTilesCache'] }, (old: any[] = []) => {
            const m = new Map(old.map(t => [t.tile_id, t]));
            m.set(payload.tile_id, { ...m.get(payload.tile_id), ...payload });
            return [...m.values()];
          })
        )
        .on('broadcast', { event: 'tile_remove' }, ({ payload }) =>
          qc.setQueriesData({ queryKey: ['fieldTilesCache'] }, (old: any[] = []) =>
            old.filter(t => t.tile_id !== payload.tile_id)
          )
        )
        .subscribe()
    );

    return () => subs.forEach(ch => ch.unsubscribe());
  }, [tileIds.join('|')]);
}