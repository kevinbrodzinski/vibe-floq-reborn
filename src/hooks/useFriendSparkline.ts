import { useQuery } from '@tanstack/react-query';

// Stub implementation - these views/tables don't exist in current schema
export const useFriendSparkline = (friendId: string | null): [number, number][] | undefined => {
  const { data } = useQuery({
    queryKey: ['friend-sparkline', friendId],
    enabled: !!friendId,
    queryFn: async () => {
      // Return mock data since the view doesn't exist
      return [
        [Date.now() - 172800000, 5] as [number, number],
        [Date.now() - 86400000, 3] as [number, number],
        [Date.now(), 7] as [number, number]
      ];
    },
    staleTime: 5 * 60 * 1000,
  });
  
  return data;
};