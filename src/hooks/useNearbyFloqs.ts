import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Use generated Supabase types for walkable floqs RPC return
type WalkableFloq = Database['public']['Functions']['get_walkable_floqs']['Returns'][number];

export interface NearbyFloqsReturn {
  nearby: WalkableFloq[];
  loading: boolean;
  error: string | null;
  count: number;
}

interface NearbyFloqsOptions {
  km?: number;
}

export function useNearbyFloqs(
  lat?: number,
  lng?: number,
  { km = 1 }: NearbyFloqsOptions = {}
): NearbyFloqsReturn {
  const queryClient = useQueryClient();

  // Initial fetch + refetch on coordinate/km changes
  const { data: floqs = [], isLoading: loading, error } = useQuery({
    queryKey: ['floqs', lat, lng, km],
    enabled: !!lat && !!lng,
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc('get_walkable_floqs', { 
        user_lat: lat!, 
        user_lng: lng!, 
        max_walk_meters: km * 1000 
      });

      if (rpcError) {
        console.error('Failed to fetch nearby floqs:', rpcError);
        throw new Error(rpcError.message);
      }

      return data || [];
    },
    staleTime: 30_000, // Cache for 30 seconds
  });

  // Realtime subscription to floqs changes
  useEffect(() => {
    if (!lat || !lng) return;

    const channel = supabase
      .channel('floqs-watch')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'floqs'
        },
        () => {
          // Fix stale closure: Use queryClient to invalidate cached data
          queryClient.invalidateQueries({ queryKey: ['floqs', lat, lng, km] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lat, lng, km, queryClient]);

  return {
    nearby: floqs,
    loading,
    error: error?.message || null,
    count: floqs.length
  };
}