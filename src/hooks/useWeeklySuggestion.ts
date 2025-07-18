import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useWeeklySuggestion = (userId?: string) => {
  const { toast } = useToast();
  
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

  // Check cooldown status
  const cooldownQuery = useQuery({
    queryKey: ['suggestion-cooldown', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_ai_suggestion_cooldowns')
        .select('last_regenerated_at')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
      
      if (!data?.last_regenerated_at) return { canRegenerate: true, hoursLeft: 0 };
      
      const lastRegen = new Date(data.last_regenerated_at);
      const hoursAgo = (Date.now() - lastRegen.getTime()) / (1000 * 60 * 60);
      const hoursLeft = Math.max(0, Math.ceil(12 - hoursAgo));
      
      return {
        canRegenerate: hoursAgo >= 12,
        hoursLeft,
        lastRegeneratedAt: lastRegen
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const queryClient = useQueryClient();
  const regenerate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-weekly-ai-suggestion', {
        body: { forceRefresh: true },
      });
      
      if (error) {
        // Handle specific error types
        if (error?.status === 429 || error?.message?.includes('cooldown_active')) {
          throw new Error('Cooldown active. Please wait before regenerating again.');
        }
        if (error.message?.includes('network_error')) {
          throw new Error('Unable to connect to AI service. Please try again later.');
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-suggestion', userId] });
      queryClient.invalidateQueries({ queryKey: ['suggestion-cooldown', userId] });
      toast({
        title: "New suggestions generated!",
        description: "Your personalized weekly coaching has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Regeneration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return { 
    ...query, 
    regenerate: regenerate.mutate,
    isRegenerating: regenerate.isPending,
    cooldown: cooldownQuery.data,
    isCooldownLoading: cooldownQuery.isLoading
  };
};