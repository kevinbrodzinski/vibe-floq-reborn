import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { tilesForViewport } from '@/lib/geo';
import { useMapViewport } from '@/hooks/useMapViewport';
import { useUserSettings } from '@/hooks/useUserSettings';

export interface FieldTile {
  tile_id: string;
  crowd_count: number;
  avg_vibe: {
    h: number;
    s: number;
    l: number;
  };
  active_floq_ids: string[];
  updated_at: string;
}

export const useFieldTiles = () => {
  const { viewport } = useMapViewport();
  const { settings } = useUserSettings();
  
  // Extract viewport bounds - assuming bounds is [nw, se]
  const nw: [number, number] = viewport.bounds ? [
    viewport.bounds[0][0], // north lat
    viewport.bounds[0][1]  // west lng
  ] : [viewport.center[0] + 0.01, viewport.center[1] - 0.01];
  
  const se: [number, number] = viewport.bounds ? [
    viewport.bounds[1][0], // south lat  
    viewport.bounds[1][1]  // east lng
  ] : [viewport.center[0] - 0.01, viewport.center[1] + 0.01];

  const tileIds = tilesForViewport(nw, se, 5);
  const enabled = settings?.field_enabled ?? false;

  return useQuery({
    queryKey: ['fieldTiles', tileIds.join('|')],
    queryFn: async (): Promise<FieldTile[]> => {
      const { data, error } = await supabase.functions.invoke('get_field_tiles', {
        body: { tile_ids: tileIds },
      });

      if (error) {
        console.error('Failed to fetch field tiles:', error);
        throw error;
      }

      return data?.tiles || [];
    },
    refetchInterval: 5000, // 5 second refresh
    staleTime: 4000,       // Consider data stale after 4 seconds
    enabled: enabled && tileIds.length > 0,
    retry: 2,
  });
};