import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/EnhancedAuthProvider';

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

// Cache achievement catalogue to reduce DB calls
let achievementCatalogueCache: any[] | null = null;
let catalogueCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCachedCatalogue() {
  const now = Date.now();
  
  // Return cache if valid
  if (achievementCatalogueCache && (now - catalogueCacheTime) < CACHE_DURATION) {
    return achievementCatalogueCache;
  }

  // Fetch fresh data
  const { data, error } = await supabase
    .from('achievement_catalogue')
    .select('*');

  if (error) throw error;

  // Update cache
  achievementCatalogueCache = data || [];
  catalogueCacheTime = now;
  
  return achievementCatalogueCache;
}

export function useAchievements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['achievements', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000, // 1 minute
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    queryFn: async (): Promise<Achievement[]> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        // Get user progress and cached catalogue in parallel
        const [userProgressResult, allCatalogue] = await Promise.all([
          supabase
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
            .eq('profile_id', user.id),
          getCachedCatalogue()
        ]);

        if (userProgressResult.error) throw userProgressResult.error;

        const data = userProgressResult.data;

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
      } catch (error) {
        console.error('Achievement fetch error:', error);
        throw error;
      }
    },
  });
}