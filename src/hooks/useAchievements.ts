import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export interface Achievement {
  code: string;
  family: string;
  name: string;
  description: string;
  icon: string;
  goal: number;
  metadata: Record<string, any>;
  progress: number;
  earned_at: string | null;
  is_earned: boolean;
  progress_percentage: number;
}

export function useAchievements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['achievements', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000, // 1 minute
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Achievement[]> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get all achievements with user progress
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          code,
          progress,
          earned_at,
          achievement_catalogue (
            code,
            family,
            name,
            description,
            icon,
            goal,
            metadata
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Also get achievements user hasn't started yet
      const { data: allCatalogue, error: catalogueError } = await supabase
        .from('achievement_catalogue')
        .select('*');

      if (catalogueError) throw catalogueError;

      // Merge user progress with full catalogue
      const userAchievementCodes = new Set(data?.map(a => a.code) || []);
      const achievements: Achievement[] = [];

      // Add achievements with progress
      data?.forEach(userAchievement => {
        const catalogue = userAchievement.achievement_catalogue;
        if (catalogue) {
          achievements.push({
            code: catalogue.code,
            family: catalogue.family,
            name: catalogue.name,
            description: catalogue.description,
            icon: catalogue.icon || '',
            goal: catalogue.goal || 0,
            metadata: (catalogue.metadata as Record<string, any>) || {},
            progress: userAchievement.progress,
            earned_at: userAchievement.earned_at,
            is_earned: !!userAchievement.earned_at,
            progress_percentage: Math.min(100, (userAchievement.progress / (catalogue.goal || 1)) * 100),
          });
        }
      });

      // Add achievements not yet started
      allCatalogue?.forEach(catalogue => {
        if (!userAchievementCodes.has(catalogue.code)) {
          achievements.push({
            code: catalogue.code,
            family: catalogue.family,
            name: catalogue.name,
            description: catalogue.description,
            icon: catalogue.icon || '',
            goal: catalogue.goal || 0,
            metadata: (catalogue.metadata as Record<string, any>) || {},
            progress: 0,
            earned_at: null,
            is_earned: false,
            progress_percentage: 0,
          });
        }
      });

      return achievements.sort((a, b) => {
        // Sort by: earned first, then by family, then by name
        if (a.is_earned !== b.is_earned) {
          return a.is_earned ? -1 : 1;
        }
        if (a.family !== b.family) {
          return a.family.localeCompare(b.family);
        }
        return a.name.localeCompare(b.name);
      });
    },
  });
}