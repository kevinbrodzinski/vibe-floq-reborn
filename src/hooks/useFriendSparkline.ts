import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useFriendSparkline = (friendId: string | null) => {
  return useQuery({
    queryKey: ['friend-sparkline', friendId],
    enabled: !!friendId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Mock data until view is available
      return Array.from({ length: 7 }, (_, i) => [
        Date.now() - (6-i) * 24 * 60 * 60 * 1000,
        Math.floor(Math.random() * 10)
      ] as [number, number]);
    },
  });
};