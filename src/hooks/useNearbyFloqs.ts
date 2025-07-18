import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Zod schema for walkable floqs
const WalkableFloqSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  primary_vibe: z.string(),
  participant_count: z.number(),
  distance_meters: z.number(),
  starts_at: z.string().nullable(),
});

type WalkableFloq = z.infer<typeof WalkableFloqSchema>;

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

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    lastLatRef.current = lat;
    lastLngRef.current = lng;
    lastKmRef.current = km;
  }

  if (import.meta.env.MODE === 'development' && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
    console.warn('useNearbyFloqs called with invalid coordinates:', { lat, lng });
  }

  const { data: floqs = [], isLoading: loading, error } = useQuery({
    queryKey: ['floqs', lastLatRef.current, lastLngRef.current, lastKmRef.current],
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc('get_walkable_floqs', {
        user_lat: lat!,
        user_lng: lng!,
        max_walk_meters: km * 1000,
      });

      if (rpcError) {
        console.error('Failed to fetch nearby floqs:', rpcError);
        throw new Error(rpcError.message);
      }

      const parsed = z.array(WalkableFloqSchema).safeParse(data);
      if (!parsed.success) {
        console.warn('❌ Invalid walkable floq data from RPC:', parsed.error);
        return [];
      }

      return parsed.data;
    },
    staleTime: 30_000,
  });

  const upsertFloq = (current: WalkableFloq[], raw: unknown): WalkableFloq[] => {
    const result = WalkableFloqSchema.safeParse(raw);
    if (!result.success) {
      if (import.meta.env.DEV) console.warn('❌ Invalid row in upsertFloq:', result.error);
      return current;
    }

    const floq = result.data;
    const index = current.findIndex(f => f.id === floq.id);
    if (index >= 0) {
      const updated = [...current];
      updated[index] = floq;
      return updated;
    }
    return [...current, floq];
  };

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const channel = supabase
      .channel('floqs-watch')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'floqs',
      }, ({ new: row, old, eventType }) => {
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
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lat, lng, km, queryClient]);

  return {
    nearby: floqs,
    loading,
    error: error?.message || null,
    count: floqs.length,
  };
}