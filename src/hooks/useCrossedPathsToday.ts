import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFriends } from './useFriends';
import { useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';

export interface CrossedPath {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  last_seen_ts: string;
  last_seen_vibe: string;
  venue_name: string | null;
  distance_meters: number;
}

export function useCrossedPathsToday() {
  const { user } = useAuth();
  const { friends } = useFriends();

  // Create stable cache key based on today and friend count
  const todayStart = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  }, []);

  const { data: crossedPaths = [], isLoading, error } = useQuery({
    queryKey: ['crossed-paths', user?.id, todayStart, friends.length],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase.rpc('people_crossed_paths_today', {
        in_me: user.id,
        proximity_meters: 20 // Start with more sensitive threshold
      });

      if (error) throw error;
      return (data || []) as CrossedPath[];
    },
    enabled: !!user?.id,
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
    isLoading,
    error,
    count: filteredCrossedPaths.length
  };
}