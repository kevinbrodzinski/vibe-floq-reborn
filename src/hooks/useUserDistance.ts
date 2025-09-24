import { useQuery } from '@tanstack/react-query';

// Mock hook for user distance calculation
export const useUserDistance = (profileId: string | undefined) => {
  return useQuery({
    queryKey: ['user-distance', profileId],
    queryFn: async () => {
      if (!profileId) return null;
      
      // TODO: Implement actual distance calculation using haversine formula
      // For now, return mock data
      return {
        distance: 1.2,
        unit: 'mi'
      };
    },
    enabled: !!profileId,
    staleTime: 60000, // 1 minute
  });
};