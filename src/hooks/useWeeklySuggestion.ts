
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export const useWeeklySuggestion = () => {
  const { toast } = useToast();
  const { user, session } = useAuth();
  
  const query = useQuery({
    queryKey: ['weekly-suggestion', user?.id],
    enabled: !!(user?.id && session?.access_token), // Only run when fully authenticated
    queryFn: async () => {
      if (!user?.id || !session?.access_token) {
        throw new Error('Authentication required');
      }
      
      const { data, error } = await supabase.functions.invoke('generate-intelligence', {
        body: { mode: 'weekly-ai', forceRefresh: false },
      });
      
      if (error) throw error;
      return data;
    },
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error?.message?.includes('Authentication') || error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Check cooldown status
  const cooldownQuery = useQuery({
    queryKey: ['suggestion-cooldown', user?.id],
    enabled: !!(user?.id && session?.access_token), // Only run when fully authenticated
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User ID required');
      }
      
      const { data, error } = await supabase
        .from('weekly_ai_suggestion_cooldowns')
        .select('last_regenerated_at')
        .eq('profile_id', user.id)
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
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error?.message?.includes('User ID required') || error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const queryClient = useQueryClient();
  const regenerate = useMutation({
    mutationFn: async () => {
      if (!user?.id || !session?.access_token) {
        throw new Error('Authentication required for regeneration');
      }
      
      const { data, error } = await supabase.functions.invoke('generate-intelligence', {
        body: { mode: 'weekly-ai', forceRefresh: true },
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
      queryClient.invalidateQueries({ queryKey: ['weekly-suggestion', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['suggestion-cooldown', user?.id] });
      toast({
        title: "New suggestions generated!",
        description: "Your personalized weekly coaching has been updated.",
      });
    },
    onError: (error: Error) => {
      console.error('[WeeklySuggestion] Regeneration error:', error);
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
    isCooldownLoading: cooldownQuery.isLoading,
    isAuthenticated: !!(user?.id && session?.access_token)
  };
};
