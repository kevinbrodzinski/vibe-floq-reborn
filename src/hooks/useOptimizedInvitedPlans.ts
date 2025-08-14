import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// Separate hook for invited plans with progressive loading
export function useOptimizedInvitedPlans() {
  return useQuery({
    queryKey: ['optimized-invited-plans'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      const queryId = `invited-plans-${Date.now()}`;
      console.time(queryId);
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.timeEnd(queryId);
        return [];
      }

      // Fixed query with explicit relationship specification
      const { data, error } = await supabase
        .from('plan_participants')
        .select(`
          plan_id,
          floq_plans!inner(
            id,
            title,
            planned_at,
            status,
            creator_id,
            floq_id,
            floqs!floq_plans_floq_id_fkey(
              title,
              location
            )
          )
        `)
        .eq('profile_id', user.user.id)
        .neq('floq_plans.creator_id', user.user.id)
        .limit(20); // Limit to prevent large queries

      if (error) {
        console.error('Invited plans query error:', error);
        console.timeEnd(queryId);
        throw error;
      }
      
      console.timeEnd(queryId);
      return data?.map(item => item.floq_plans).filter(Boolean) || [];
    }
  });
}