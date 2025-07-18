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
  
  // Extract viewport bounds - bounds format is [west, south, east, north]
  const [west, south, east, north] = viewport.bounds;
  const nw: [number, number] = [north, west];
  const se: [number, number] = [south, east];

  const tileIds = tilesForViewport(nw, se, 5);
  const enabled = settings?.field_enabled ?? false;

  return useQuery({
    queryKey: ['fieldTiles', tileIds.join('|')],
    queryFn: async (): Promise<FieldTile[]> => {
      console.time('get_field_tiles');
      console.log(`🔄 Fetching ${tileIds.length} field tiles:`, tileIds);
      
      const { data, error } = await supabase.functions.invoke('get_field_tiles', {
        body: { tile_ids: tileIds },
      });

      console.timeEnd('get_field_tiles');

      if (error) {
        console.error('❌ Failed to fetch field tiles:', error);
        throw error;
      }

      console.log(`✅ Retrieved ${data?.tiles?.length || 0} field tiles`);
      return data?.tiles || [];
    },
    refetchInterval: 5000, // 5 second refresh
    staleTime: 4000,       // Consider data stale after 4 seconds
    enabled: enabled && tileIds.length > 0,
    retry: 2,
  });
};