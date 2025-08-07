import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserStreak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  streak_type: 'daily_checkin' | 'venue_visit' | 'plan_participation';
}

export const useUserStreak = (streakType: UserStreak['streak_type'] = 'daily_checkin') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-streak', user?.id, streakType],
    queryFn: async (): Promise<UserStreak | null> => {
      if (!user?.id) return null;

      // For now, calculate streak based on recent activity
      // This could be enhanced with a dedicated streaks table later
      const { data, error } = await supabase
        .rpc('get_user_streak', { 
          p_profile_id: user.id, 
          p_streak_type: streakType 
        })
        .single();

      if (error) {
        // If the RPC doesn't exist yet, return default values
        if (error.code === '42883') { // function does not exist
          return {
            current_streak: 0,
            longest_streak: 0,
            last_activity_date: null,
            streak_type: streakType
          };
        }
        throw error;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};