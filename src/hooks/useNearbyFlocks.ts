import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import type { Vibe } from "@/types";
import type { FloqFilters } from "@/contexts/FloqUIContext";
import { useEffect } from "react";

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
  friendsGoing?: {
    count: number;
    avatars: string[];
    names: string[];
  };
}

interface UseNearbyFlocksOptions {
  geo?: { lat: number; lng: number };
  filters?: FloqFilters;
  limit?: number;
  enabled?: boolean;
}

export function useNearbyFlocks({ 
  geo, 
  filters = {},
  limit = 20, 
  enabled = true 
}: UseNearbyFlocksOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up real-time subscription for nearby flocks
  useEffect(() => {
    const channel = supabase
      .channel('flocks')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'floqs' }, () => {
        queryClient.invalidateQueries({ queryKey: ["nearby-flocks"] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'floqs' }, () => {
        queryClient.invalidateQueries({ queryKey: ["nearby-flocks"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["nearby-flocks", user?.id, geo?.lat, geo?.lng, filters, limit],
    enabled: enabled && !!geo && typeof geo.lat === 'number' && typeof geo.lng === 'number',
    queryFn: async (): Promise<NearbyFloq[]> => {
      if (!geo || typeof geo.lat !== 'number' || typeof geo.lng !== 'number') {
        return [];
      }
      
      // Use search_floqs to get friends going data
      const { data, error } = await supabase.rpc("search_floqs", {
        p_lat: Number(geo.lat),
        p_lng: Number(geo.lng),
        p_radius_km: 25,
        p_query: '',
        p_vibe_ids: [],
        p_time_from: new Date().toISOString(),
        p_time_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        p_limit: limit,
        _viewer_id: user?.id || null,
      });

      if (error) {
        console.error("Nearby flocks error:", error);
        throw error;
      }

      if (!data) return [];

      // Get user's joined floqs to mark as joined
      let joinedFloqIds: string[] = [];
      if (user) {
        const { data: joinedData } = await supabase
          .from('floq_participants')
          .select('floq_id')
          .eq('user_id', user.id);
        
        joinedFloqIds = joinedData?.map(item => item.floq_id) || [];
      }

      // Transform and filter the data
      let filteredData = data.map(floq => ({
        id: floq.id,
        title: floq.title,
        name: floq.name || undefined,
        description: floq.description || undefined,
        primary_vibe: floq.primary_vibe,
        vibe_tag: floq.vibe_tag || undefined,
        participant_count: Number(floq.participant_count),
        boost_count: 0, // search_floqs doesn't return boost_count
        distance_meters: Number(floq.distance_m || 0),
        activity_score: 0, // search_floqs doesn't return activity_score
        starts_at: floq.starts_at || undefined,
        ends_at: floq.ends_at || undefined,
        starts_in_min: 0, // Calculate from starts_at if needed
        max_participants: undefined, // search_floqs doesn't return max_participants
        members: [], // search_floqs doesn't return members array
        is_joined: joinedFloqIds.includes(floq.id),
        creator_id: undefined, // search_floqs doesn't return creator_id
        friends_going_count: floq.friends_going_count || 0,
        friends_going_avatars: floq.friends_going_avatars || [],
        friends_going_names: floq.friends_going_names || [],
      }));

      // Apply filters
      if (filters.vibe) {
        filteredData = filteredData.filter(floq => 
          floq.primary_vibe === filters.vibe || floq.vibe_tag === filters.vibe
        );
      }

      if (filters.distanceKm !== undefined) {
        const maxDistance = filters.distanceKm * 1000; // Convert to meters
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
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}