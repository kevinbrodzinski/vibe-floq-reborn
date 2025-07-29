import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import type { Vibe } from '@/types';
import type { FloqFilters } from '@/contexts/FloqUIContext';
import { useEffect } from 'react';
import { z } from 'zod';
import { VibeEnum } from '@/types/vibes';

export interface NearbyFloq {
  id: string;
  title: string;
  name?: string;
  description?: string;
  primary_vibe: Vibe;
  vibe_tag?: Vibe;
  participant_count: number;
  boost_count: number;
  distance_meters: number;
  starts_at?: string;
  ends_at?: string;
  starts_in_min: number;
  max_participants?: number;
  members: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  }>;
  activity_score?: number;
  is_joined: boolean;
  creator_id?: string;
  hasUserBoosted?: boolean;
  friends_going_count?: number;
  friends_going_avatars?: string[];
  friends_going_names?: string[];
}

interface UseNearbyFlocksOptions {
  geo?: { lat: number; lng: number };
  filters?: FloqFilters;
  limit?: number;
  enabled?: boolean;
}

const SearchFloqSchema = z.object({
  id: z.string(),
  title: z.string(),
  primary_vibe: VibeEnum,
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  distance_m: z.number().optional(),
  participant_count: z.union([z.number(), z.string()]),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  vibe_tag: z.string().optional().nullable(),
  friends_going_count: z.number().optional(),
  friends_going_avatars: z.array(z.string()).optional(),
  friends_going_names: z.array(z.string()).optional(),
});

export function useNearbyFlocks({
  geo,
  filters = {},
  limit = 20,
  enabled = true,
}: UseNearbyFlocksOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('flocks')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'floqs' }, () => {
        queryClient.invalidateQueries({ queryKey: ['nearby-flocks'] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'floqs' }, () => {
        queryClient.invalidateQueries({ queryKey: ['nearby-flocks'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['nearby-flocks', user?.id, geo?.lat, geo?.lng, filters, limit],
    enabled: enabled && !!geo && typeof geo.lat === 'number' && typeof geo.lng === 'number',
    queryFn: async (): Promise<NearbyFloq[]> => {
      if (!geo) return [];

      const { data, error } = await supabase.rpc('search_floqs', {
        p_lat: geo.lat,
        p_lng: geo.lng,
        p_radius_km: 25,
        p_query: '',
        p_vibe_ids: [],
        p_time_from: new Date().toISOString(),
        p_time_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        p_limit: limit,
        // _viewer_id: user?.id || null, // commented out - not in current RPC signature
      });

      if (error) {
        console.error('Nearby flocks error:', error);
        throw error;
      }

      if (!data) return [];

      const parsed = z.array(SearchFloqSchema).safeParse(data);
      if (!parsed.success) {
        console.warn('❌ Invalid search_floqs data:', parsed.error);
        return [];
      }

      let joinedFloqIds: string[] = [];
      if (user) {
        const { data: joinedData } = await supabase
          .from('floq_participants')
          .select('floq_id')
          .eq('profile_id', user.id);

        joinedFloqIds = joinedData?.map(item => item.floq_id) || [];
      }

      let filteredData = parsed.data.map(floq => {
        const startsAt = floq.starts_at ? new Date(floq.starts_at) : new Date();
        const now = new Date();
        const startsInMin = Math.max(0, Math.floor((startsAt.getTime() - now.getTime()) / 60000));

        return {
          id: floq.id,
          title: floq.title,
          name: floq.name || undefined,
          description: floq.description || undefined,
          primary_vibe: floq.primary_vibe as Vibe,
          vibe_tag: floq.vibe_tag as Vibe,
          participant_count: Number(floq.participant_count),
          boost_count: 0,
          distance_meters: Number(floq.distance_m || 0),
          activity_score: 0,
          starts_at: floq.starts_at || undefined,
          ends_at: floq.ends_at || undefined,
          starts_in_min: startsInMin,
          max_participants: undefined,
          members: [],
          is_joined: joinedFloqIds.includes(floq.id),
          creator_id: undefined,
          friends_going_count: floq.friends_going_count || 0,
          friends_going_avatars: floq.friends_going_avatars || [],
          friends_going_names: floq.friends_going_names || [],
        };
      });

      if (filters.vibe) {
        filteredData = filteredData.filter(floq =>
          floq.primary_vibe === filters.vibe || floq.vibe_tag === filters.vibe
        );
      }

      if (filters.distanceKm !== undefined) {
        const maxDistance = filters.distanceKm * 1000;
        filteredData = filteredData.filter(floq =>
          floq.distance_meters <= maxDistance
        );
      }

      if (filters.isActive) {
        filteredData = filteredData.filter(floq =>
          floq.participant_count > 0
        );
      }

      return filteredData;
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}