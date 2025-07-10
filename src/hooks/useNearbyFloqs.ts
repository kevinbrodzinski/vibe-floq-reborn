import { useEffect, useRef } from 'react';
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
  const lastLatRef = useRef<number>();
  const lastLngRef = useRef<number>();
  const lastKmRef = useRef<number>();

  // Freeze coordinates once they become valid for stable cache keys
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    lastLatRef.current = lat;
    lastLngRef.current = lng;
    lastKmRef.current = km;
  }

  // Development assertion for invalid coordinates
  if (process.env.NODE_ENV === 'development' && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
    console.warn('useNearbyFloqs called with invalid coordinates:', { lat, lng });
  }

  // Initial fetch + refetch on coordinate/km changes
  const { data: floqs = [], isLoading: loading, error } = useQuery({
    queryKey: ['floqs', lastLatRef.current, lastLngRef.current, lastKmRef.current],
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
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

  // Helper function to upsert floq data
  const upsertFloq = (current: WalkableFloq[], row: any): WalkableFloq[] => {
    const floq: WalkableFloq = {
      id: row.id,
      title: row.title,
      primary_vibe: row.primary_vibe,
      participant_count: row.participant_count || 0,
      distance_meters: row.distance_meters || 0,
      starts_at: row.starts_at,
    };

    const index = current.findIndex(f => f.id === floq.id);
    if (index >= 0) {
      const updated = [...current];
      updated[index] = floq;
      return updated;
    }
    return [...current, floq];
  };

  // Realtime subscription to floqs changes
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const channel = supabase
      .channel('floqs-watch')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'floqs'
        },
        ({ new: row, old, eventType }) => {
          // Use stable cache key with frozen coordinates
          const key = ['floqs', lastLatRef.current, lastLngRef.current, lastKmRef.current];

          queryClient.setQueryData<WalkableFloq[]>(key, current => {
            if (!current) return current;

            switch (eventType) {
              case 'INSERT':
              case 'UPDATE':
                return upsertFloq(current, row);
              case 'DELETE':
                return current.filter(f => f.id !== old?.id);
              default:
                return current;
            }
          });
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