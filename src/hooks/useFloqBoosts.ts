import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BoostFloqParams {
  floqId: string;
  boostType?: 'vibe' | 'activity';
}

export function useFloqBoosts(floqId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['floq-boosts', floqId],
    queryFn: async () => {
      const { data, error } = await supabase.from('floq_boosts')
        .select('count, user_has_boosted')
        .eq('floq_id', floqId)
        .maybeSingle();

      if (error) throw error;

      return data || { count: 0, user_has_boosted: false };
    },
    enabled: !!floqId,
    staleTime: 60_000, // 1 minute
    refetchInterval: 120_000, // 2 minutes
  });

  const boostFloq = useMutation({
    mutationFn: async ({ floqId, boostType = 'vibe' }: BoostFloqParams) => {
      const { data, error } = await supabase.functions.invoke('boost-floq', {
        body: { floq_id: floqId, boost_type: boostType }
      })

      if (error) throw error
      return data
    },
    onSuccess: (data, variables) => {
      // Safely access response properties
      const result = data && typeof data === 'object' ? data : {}
      const responseFloqId = 'floq_id' in result ? result.floq_id : variables.floqId
      const responseUserId = 'profile_id' in result ? result.user_id : null

      // Optimistically update boost count
      queryClient.setQueryData(['floq-boosts', variables.floqId], (old: any) => {
        if (!old) return { count: 1, userHasBoosted: true }
        return {
          count: old.count + 1,
          userHasBoosted: true
        }
      })

      queryClient.invalidateQueries({ queryKey: ['floq-boosts', responseFloqId] })
    },
    onError: (error) => {
      console.error('Failed to boost floq:', error)
    },
  })

  return {
    ...query,
    boost: boostFloq.mutateAsync,
    boosting: boostFloq.isPending,
  }
}

// Additional hook exports
export function useFloqBoost() {
  return useMutation({
    mutationFn: async ({ floqId }: { floqId: string }) => {
      const { data, error } = await supabase.functions.invoke('boost-floq', {
        body: { floq_id: floqId, boost_type: 'vibe' }
      })
      if (error) throw error
      return data
    }
  })
}

export function useUserBoostStatus(floqId: string) {
  return useQuery({
    queryKey: ['user-boost-status', floqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floq_boosts')
        .select('*')
        .eq('floq_id', floqId)
        .eq('profile_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle()
      
      if (error) throw error
      return !!data
    },
    enabled: !!floqId
  })
}

export function useBoostSubscription(floqId: string) {
  return useQuery({
    queryKey: ['boost-subscription', floqId],
    queryFn: async () => {
      return { subscribed: true } // Placeholder
    },
    enabled: !!floqId
  })
}
