import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useWeeklySuggestion = (userId?: string) => {
  const query = useQuery({
    queryKey: ['weekly-suggestion', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-weekly-ai-suggestion', {
        body: { forceRefresh: false },
      });
      
      if (error) throw error;
      return data;
    },
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
  });

  const queryClient = useQueryClient();
  const regenerate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-weekly-ai-suggestion', {
        body: { forceRefresh: true },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weekly-suggestion', userId] }),
  });

  return { 
    ...query, 
    regenerate: regenerate.mutate,
    isRegenerating: regenerate.isPending 
  };
};