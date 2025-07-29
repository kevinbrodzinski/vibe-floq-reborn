import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedFriends } from './useUnifiedFriends';
import { useMemo, useEffect, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import type { CrossedPath } from '@/types';
import { OFFLINE_MODE } from '@/lib/constants';

export function useCrossedPathsToday() {
  
  const { user } = useAuth();
  const { friendIds: friends } = useUnifiedFriends();
  const { toast } = useToast();
  const { socialHaptics } = useHapticFeedback();
  
  // Track previous count for haptic feedback
  const prevCountRef = useRef(0);

  // Create stable cache key based on today and friend count
  const todayStart = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  }, []);

  const { data: crossedPaths = [], isLoading, error, refetch } = useQuery({
    queryKey: ['crossed-paths', user?.id, todayStart, friends.length],
    queryFn: async () => {
      if (OFFLINE_MODE) {
        return [] as CrossedPath[];
      }
      
      if (!user?.id) return [];
      
      try {
        // Try to call the SQL function (may not exist yet)
        const { data, error } = await supabase.rpc('people_crossed_paths_today', {
          in_me: user.id,
          proximity_meters: 25
        });

        if (error) {
          console.warn('Crossed paths function not available yet:', error);
          // Return empty array instead of throwing - this prevents UI from breaking
          return [] as CrossedPath[];
        }
        return (data || []) as unknown as CrossedPath[];
      } catch (err) {
        console.warn('Crossed paths function not implemented yet:', err);
        // Return empty array to prevent UI from breaking
        return [] as CrossedPath[];
      }
    },
    enabled: !!user?.id && !OFFLINE_MODE,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000, // Live refresh while Afterglow open
    retry: 3,
    refetchOnWindowFocus: false,
  });

  // Filter out existing friends from crossed paths
  const filteredCrossedPaths = useMemo(() => {
    const friendsSet = new Set(friends);
    return crossedPaths.filter(person => !friendsSet.has(person.profile_id));
  }, [crossedPaths, friends]);

  // Trigger haptic feedback when new crossed paths are detected
  useEffect(() => {
    if (!filteredCrossedPaths) return;

    const newCount = filteredCrossedPaths.length;
    const prevCount = prevCountRef.current;

    // Only trigger haptic if count increased (new paths found)
    if (newCount > prevCount && prevCount > 0) {
      socialHaptics.crossedPathsDetected();
    }
    
    prevCountRef.current = newCount;
  }, [filteredCrossedPaths, socialHaptics]);

  return {
    crossedPaths: filteredCrossedPaths,
    isLoading,
    error,
    refetch,
    count: filteredCrossedPaths.length
  };
}