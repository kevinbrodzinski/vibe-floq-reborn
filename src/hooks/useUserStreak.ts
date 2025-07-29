import { useQuery } from '@tanstack/react-query';

// Mock hook for user streak data
export const useUserStreak = (profileId: string | undefined) => {
  return useQuery({
    queryKey: ['user-streak', profileId],
    queryFn: async () => {
      if (!profileId) return null;
      
      // TODO: Implement actual streak calculation from activity data
      // For now, return mock data
      return {
        currentStreak: 5,
        longestStreak: 12,
        lastActiveDate: new Date().toISOString()
      };
    },
    enabled: !!profileId,
    staleTime: 300000, // 5 minutes
  });
};