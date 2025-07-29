import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

type LeaderboardRow = {
  id: string;
  checkins_30d: number;
  rank: number;
  total_users: number;
  percentile: number;
};

export const useLeaderboardStats = () => {
  const { user } = useAuth();

  return useQuery<LeaderboardRow | null>({
    queryKey : ['leaderboard-stats', user?.id],
    enabled  : !!user?.id,
    staleTime: 10 * 60 * 1000,
    queryFn  : async (): Promise<LeaderboardRow | null> => {
      const { data, error } = await supabase
        .rpc('get_leaderboard_rank' as any, { p_profile_id: user!.id });
      if (error) throw error;
      return data as LeaderboardRow | null;
    },
  });
};