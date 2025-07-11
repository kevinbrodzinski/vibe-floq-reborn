import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeaderboardStats {
  user_rank: number | null;
  total_users: number;
  percentile: number;
}

export function useLeaderboardStats() {
  return useQuery<LeaderboardStats>({
    queryKey: ['leaderboard-stats'],
    staleTime: 60_000, // 1 min
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user's rank from materialized view
      const { data, error } = await supabase
        .from('leaderboard_cache')
        .select('rank')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Get total users count
      const { count } = await supabase
        .from('leaderboard_cache')
        .select('*', { count: 'exact', head: true });

      const totalUsers = count ?? 0;
      const userRank = data?.rank ?? null;

      return {
        user_rank: userRank,
        total_users: totalUsers,
        percentile: userRank && totalUsers > 0
          ? Math.round((1 - userRank / totalUsers) * 1000) / 10 // 1 decimal
          : 0,
      };
    },
  });
}