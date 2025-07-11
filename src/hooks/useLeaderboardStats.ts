import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export interface LeaderboardStats {
  user_rank: number | null;
  total_users: number;
  percentile: number;
}

export function useLeaderboardStats() {
  const { user } = useAuth();
  
  return useQuery<LeaderboardStats>({
    queryKey: ['leaderboard-stats', user?.id],
    staleTime: 60_000, // 1 min
    enabled: !!user, // Only run query when user is authenticated
    queryFn: async () => {
      if (!user) {
        return {
          user_rank: null,
          total_users: 0,
          percentile: 0,
        };
      }

      // Single query to get user rank and total users
      const { data, error } = await supabase
        .from('leaderboard_cache')
        .select('rank, total_users')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      const totalUsers = data?.total_users ?? 0;
      const userRank = data?.rank ?? null;

      // Zero-division guard for percentile calculation
      const percentile = userRank && totalUsers > 0
        ? Math.round((1 - userRank / totalUsers) * 1000) / 10
        : 0;

      return {
        user_rank: userRank,
        total_users: totalUsers,
        percentile,
      };
    },
  });
}