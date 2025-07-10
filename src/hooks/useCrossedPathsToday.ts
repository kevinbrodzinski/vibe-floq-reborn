import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGeolocation } from './useGeolocation';
import { useFriends } from './useFriends';
import { useMemo } from 'react';

export interface CrossedPath {
  user_id: string;
  display_name: string;
  avatar_url: string;
  last_seen_ts: string;
  last_seen_vibe: string;
  venue_name: string | null;
  distance_meters: number;
}

export function useCrossedPathsToday() {
  const { lat, lng, loading: geoLoading } = useGeolocation();
  const { friends } = useFriends();

  // Create stable cache key based on today and friend count
  const todayStart = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  }, []);

  const { data: crossedPaths = [], isLoading, error } = useQuery({
    queryKey: ['crossed-paths', todayStart, friends.length],
    queryFn: async () => {
      if (!lat || !lng) return [];
      
      const { data, error } = await supabase.rpc('people_crossed_paths_today', {
        user_lat: lat,
        user_lng: lng,
        proximity_meters: 20 // Start with more sensitive threshold
      });

      if (error) throw error;
      return (data || []) as CrossedPath[];
    },
    enabled: !geoLoading && lat !== null && lng !== null,
    staleTime: 60 * 1000, // 60 seconds
    retry: 3,
    refetchOnWindowFocus: false,
  });

  // Filter out existing friends from crossed paths
  const filteredCrossedPaths = useMemo(() => {
    const friendsSet = new Set(friends);
    return crossedPaths.filter(person => !friendsSet.has(person.user_id));
  }, [crossedPaths, friends]);

  return {
    crossedPaths: filteredCrossedPaths,
    isLoading: isLoading || geoLoading,
    error,
    count: filteredCrossedPaths.length
  };
}