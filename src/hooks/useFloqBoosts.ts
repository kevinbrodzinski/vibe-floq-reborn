import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';

interface BoostFloqParams {
  floqId: string;
  boostType?: string;
}

// Hook to get user's boost status for a specific floq
export const useUserBoostStatus = (floqId: string) => {
  const userId = useCurrentUserId();
  
  return useQuery({
    queryKey: ['user-boost-status', floqId, userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('floq_boosts')
        .select('id, created_at')
        .eq('floq_id', floqId)
        .eq('user_id', userId)
        .eq('boost_type', 'vibe')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!floqId,
    staleTime: 30_000, // Cache for 30 seconds
  });
};

// Global boost subscription hook (optimized for 1-hour boosts)
export const useBoostSubscription = () => {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  useEffect(() => {
    if (!userId) return;

    console.log('🔄 Setting up boost subscription (1hr boosts)');

    const channel = supabase
      .channel('floq-boosts-global-optimized')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'floq_boosts',
          filter: 'boost_type=eq.vibe'
        },
        (payload) => {
          console.log('📡 Boost realtime event:', payload.eventType, payload.new || payload.old);
          
          const floqId = payload.new?.floq_id || payload.old?.floq_id;
          
          // Optimized: only invalidate specific user boost status
          if (payload.new?.user_id === userId || payload.old?.user_id === userId) {
            queryClient.invalidateQueries({ 
              queryKey: ['user-boost-status', floqId, userId] 
            });
          }
          
          // Batch invalidation with debouncing to reduce queries
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['active-floqs'] });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up boost subscription');
      supabase.removeChannel(channel).catch(() => {
        // Ignore cleanup errors
      });
    };
  }, [userId, queryClient]);
};

export const useFloqBoost = () => {
  const queryClient = useQueryClient();
  console.log('🔗 useFloqBoost hook initialized (hardened system)');
  const userId = useCurrentUserId();

  const boostFloq = useMutation({
    mutationFn: async ({ floqId, boostType = 'vibe' }: BoostFloqParams) => {
      const currentUserId = userId; // Capture userId at mutation time for safety
      if (!currentUserId) throw new Error('User not authenticated');
      
      // Use boost analytics edge function with race-condition protection
      const { data, error } = await supabase.functions.invoke('boost-analytics', {
        body: {
          action: 'boost',
          floqId,
          userId: currentUserId,
          boostType
        }
      });
      
      if (error) throw error;
      return data;
    },
    onMutate: async (variables) => {
      // Optimistic update before API call (prevents flicker)
      await queryClient.cancelQueries({ queryKey: ['active-floqs'] });
      
      const previousFloqs = queryClient.getQueryData(['active-floqs']);
      
      queryClient.setQueryData(['active-floqs'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((floq: any) => 
          floq.id === variables.floqId 
            ? { ...floq, boost_count: (floq.boost_count || 0) + 1 }
            : floq
        );
      });

      return { previousFloqs };
    },
    onSuccess: (data, variables) => {
      // Update user boost status for fire-and-forget behavior (1-hour duration)
      queryClient.setQueryData(
        ['user-boost-status', variables.floqId, userId], 
        data.boost
      );
      
      // Invalidate queries for fresh data
      queryClient.invalidateQueries({ queryKey: ['active-floqs'] });
      queryClient.invalidateQueries({ queryKey: ['user-boost-status'] });
      
      console.log('📊 Boost analytics data (1hr duration):', data.analytics);
      
      toast({
        title: "Floq boosted! ⚡",
        description: "You've given this gathering extra energy for 1 hour.",
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousFloqs) {
        queryClient.setQueryData(['active-floqs'], context.previousFloqs);
      }

      console.error('❌ Boost error:', error);
      
      // Handle rate limiting with improved messaging - check multiple error status indicators
      if (error.statusCode === 429 || error.status === 429 || error.details?.code === 'RATE_LIMIT_EXCEEDED') {
        const { currentBoosts, maxBoosts, retryAfter } = error.details || {};
        const minutesLeft = retryAfter ? Math.ceil(retryAfter / 60) : 60;
        toast({
          title: "Rate limit reached",
          description: `You've used ${currentBoosts || '60'}/${maxBoosts || '60'} boosts this hour. Try again in ${minutesLeft} minutes.`,
          variant: "destructive",
        });
        return;
      }
      
      // Handle already boosted (constraint violation)
      if (error.details?.code === 'ALREADY_BOOSTED' || error.message?.includes('duplicate')) {
        toast({
          title: "Already boosted!",
          description: "You've already boosted this floq. Boosts are fire-and-forget.",
          variant: "default",
        });
        return;
      }
      
      toast({
        title: "Failed to boost floq",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  });

  // Remove boost is disabled (fire-and-forget requirement)
  const removeBoost = useMutation({
    mutationFn: async () => {
      throw new Error('Boost removal is disabled. Boosts are fire-and-forget.');
    },
    onError: () => {
      toast({
        title: "Boost removal disabled",
        description: "Boosts are fire-and-forget and cannot be removed.",
        variant: "default",
      });
    }
  });

  return {
    boost: boostFloq.mutate,
    removeBoost: () => {
      toast({
        title: "Boost removal disabled",
        description: "Boosts are fire-and-forget and cannot be removed.",
        variant: "default",
      });
    },
    isPending: boostFloq.isPending,
  };
};