import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PlanRsvpArgs {
  planId: string;
  join: boolean;
}

export const usePlanRsvp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, join }: PlanRsvpArgs) => {
      const { data, error } = await supabase.rpc('join_or_leave_plan', {
        p_plan_id: planId,
        p_join: join
      });

      if (error) throw error;
      return data;
    },
    onMutate: async ({ planId, join }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['floq-plans'] });
      
      // Optimistically update the cache
      const previousPlans = queryClient.getQueryData(['floq-plans']);
      
      queryClient.setQueryData(['floq-plans'], (old: any) => {
        if (!old) return old;
        return old.map((plan: any) =>
          plan.id === planId ? { ...plan, is_joined: join } : plan
        );
      });

      return { previousPlans };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousPlans) {
        queryClient.setQueryData(['floq-plans'], context.previousPlans);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['floq-plans'] });
      queryClient.invalidateQueries({ queryKey: ['floq-details'] });
    }
  });
};