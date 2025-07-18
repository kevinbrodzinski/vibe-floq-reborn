import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tilesForViewport } from '@/lib/geo';
import { useMapViewport } from '@/hooks/useMapViewport';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useFieldDiffs } from '@/hooks/useFieldDiffs';
import { supabase } from '@/integrations/supabase/client';

export const useFieldTiles = () => {
  const { viewport } = useMapViewport();
  const [west, south, east, north] = viewport.bounds;      // mapbox format
  const nw: [number, number] = [north, west];
  const se: [number, number] = [south, east];
  const tileIds = tilesForViewport(nw, se, viewport.zoom).sort(); // stable

  const { settings } = useUserSettings();
  const enabled = settings?.field_enabled ?? false;
  const qc = useQueryClient();

  // Subscribe to realtime diffs
  useFieldDiffs(enabled ? tileIds : []);

  return useQuery({
    queryKey: ['fieldTiles', tileIds.join('|')],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get_field_tiles', {
        body: { tile_ids: tileIds }
      });
      if (error) throw error;
      return data.tiles;
    },
    refetchInterval: enabled ? 5000 : false,
    staleTime: 4000,
    enabled,
  });
};