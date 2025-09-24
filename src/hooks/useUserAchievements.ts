import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserAchievements = (profileId: string | undefined) => {
  return useQuery({
    queryKey: ['user-achievements', profileId],
    queryFn: async () => {
      if (!profileId) return [];

      const { data: achievements } = await supabase
        .from('achievements')
        .select('*')
        .eq('profile_id', profileId as any)
        .order('earned_at', { ascending: false })
        .limit(10)
        .returns<any>();

      return (achievements as any)?.map((achievement: any) => ({
        id: achievement.id,
        name: achievement.achievement_type || 'Unknown',
        description: 'Achievement earned',
        icon: '🏆',
        earnedAt: achievement.earned_at
      })) || [];
    },
    enabled: !!profileId,
    staleTime: 300000, // 5 minutes
  });
};