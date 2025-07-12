
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BoostFloqParams {
  floqId: string;
  boostType?: string;
}

export const useFloqBoost = () => {
  const queryClient = useQueryClient();

  const boostFloq = useMutation({
    mutationFn: async ({ floqId, boostType = 'vibe' }: BoostFloqParams) => {
      const { data, error } = await supabase
        .from('floq_boosts')
        .insert({
          floq_id: floqId,
          boost_type: boostType,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Optimistically update the floqs list boost count
      queryClient.setQueryData(['active-floqs'], (old: any[]) => {
        if (!old) return old;
        return old.map(floq => 
          floq.id === variables.floqId 
            ? { ...floq, boost_count: (floq.boost_count || 0) + 1 }
            : floq
        );
      });
      
      // Invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: ['active-floqs'] });
      
      toast({
        title: "Boosted floq! ⚡",
        description: "You've given this gathering some extra energy.",
      });
    },
    onError: (error: any) => {
      // Handle duplicate boost attempts gracefully
      if (error.message?.includes('unique_user_boost') || error.message?.includes('duplicate')) {
        toast({
          title: "Already boosted!",
          description: "You've already boosted this floq.",
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

  const removeBoost = useMutation({
    mutationFn: async ({ floqId, boostType = 'vibe' }: BoostFloqParams) => {
      const { error } = await supabase
        .from('floq_boosts')
        .delete()
        .eq('floq_id', floqId)
        .eq('boost_type', boostType)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Optimistically update the floqs list boost count
      queryClient.setQueryData(['active-floqs'], (old: any[]) => {
        if (!old) return old;
        return old.map(floq => 
          floq.id === variables.floqId 
            ? { ...floq, boost_count: Math.max(0, (floq.boost_count || 0) - 1) }
            : floq
        );
      });
      
      // Invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: ['active-floqs'] });
      
      toast({
        title: "Boost removed",
        description: "You've removed your boost from this floq.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove boost",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  });

  return {
    boost: boostFloq.mutate,
    removeBoost: removeBoost.mutate,
    isPending: boostFloq.isPending || removeBoost.isPending,
  };
};
