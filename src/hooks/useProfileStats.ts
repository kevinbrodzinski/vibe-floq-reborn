import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export interface ProfileStats {
  friend_count: number;
  crossings_7d: number;
  most_active_vibe: string;
  days_active_this_month: number;
  total_achievements: number;
}

export const useProfileStats = (targetUserId?: string) => {
  const { user } = useAuth();
  const userId = targetUserId || user?.id;

  return useQuery({
    queryKey: ['profile-stats', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase.rpc('get_profile_stats', {
        target_user_id: userId,
        metres: 100,
        seconds: 3600
      });

      if (error) throw error;
      return data as unknown as ProfileStats;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};