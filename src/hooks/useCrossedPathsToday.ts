import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFriends } from './useFriends';
import { useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import type { CrossedPath } from '@/types';

export function useCrossedPathsToday() {
  const { user } = useAuth();
  const { friends } = useFriends();
  const { toast } = useToast();

  // Create stable cache key based on today and friend count
  const todayStart = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  }, []);

  const { data: crossedPaths = [], isLoading, error, refetch } = useQuery({
    queryKey: ['crossed-paths', user?.id, todayStart, friends.length],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase.rpc('people_crossed_paths_today', {
        in_me: user.id,
        proximity_meters: 25
      });

      if (error) {
        console.error('Failed to load crossed paths:', error);
        toast({
          title: "Failed to load crossed paths",
          description: "There was a problem loading your recent encounters. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
      return (data || []) as unknown as CrossedPath[];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000, // Live refresh while Afterglow open
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
    refetch,
    count: filteredCrossedPaths.length
  };
}