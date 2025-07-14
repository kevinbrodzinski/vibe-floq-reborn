import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { NearbyFloq } from '@/hooks/useNearbyFlocks';

export const useIgnoreFloq = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ floqId }: { floqId: string }) => {
      const { error } = await supabase.functions.invoke('ignore-floq', {
        body: { floq_id: floqId },
      });
      if (error) throw error;
    },
    onSuccess: (_, { floqId }) => {
      // Remove floq from all cached nearby flocks lists with more specific cache invalidation
      queryClient.removeQueries({ 
        queryKey: ['nearby-flocks'], 
        predicate: (query) => {
          const data = query.state.data as NearbyFloq[] | undefined;
          return data?.some(f => f.id === floqId) ?? false;
        }
      });
    },
  });
};