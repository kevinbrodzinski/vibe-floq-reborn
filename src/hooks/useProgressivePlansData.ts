import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedUserPlans } from './useOptimizedUserPlans';
import { useOptimizedInvitedPlans } from './useOptimizedInvitedPlans';

export type PlanFilter = 'all' | 'draft' | 'active' | 'completed' | 'invited';

// Progressive loading hook that loads user plans first, then invited plans
export function useProgressivePlansData() {
  const [filter, setFilter] = useState<PlanFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load user's own plans first (faster query)
  const { 
    plansByStatus, 
    stats, 
    isLoading: isLoadingUserPlans, 
    plans: userPlans 
  } = useOptimizedUserPlans();

  // Load invited plans separately (slower query)
  const { 
    data: invitedPlans = [], 
    isLoading: isLoadingInvited 
  } = useOptimizedInvitedPlans();

  // Show user plans immediately, invited plans when available
  const isInitialLoading = isLoadingUserPlans;
  const isLoadingAdditional = isLoadingInvited;

  // Combine and categorize plans efficiently
  const categorizedPlans = useMemo(() => {
    const draft = plansByStatus.draft;
    const active = plansByStatus.executing.concat(plansByStatus.finalized);
    const completed = plansByStatus.completed.concat(plansByStatus.cancelled);
    const invited = invitedPlans;

    return { draft, active, completed, invited };
  }, [plansByStatus, invitedPlans]);

  // Optimized create plan mutation
  const createNewPlan = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('floq_plans')
        .insert({
          title: 'Untitled Plan',
          floq_id: null,
          creator_id: user.user.id,
          status: 'draft',
          planned_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Optimized cache invalidation
      queryClient.invalidateQueries({ queryKey: ['optimized-user-plans'] });
      toast({
        title: 'Plan created',
        description: 'Your new plan is ready to edit'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating plan',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Optimized filter and search
  const filteredPlans = useMemo(() => {
    let plans = [];
    
    switch (filter) {
      case 'draft':
        plans = categorizedPlans.draft;
        break;
      case 'active':
        plans = categorizedPlans.active;
        break;
      case 'completed':
        plans = categorizedPlans.completed;
        break;
      case 'invited':
        plans = categorizedPlans.invited;
        break;
      default:
        plans = [...categorizedPlans.draft, ...categorizedPlans.active, ...categorizedPlans.completed, ...categorizedPlans.invited];
    }

    // Optimized search with early return
    if (!searchQuery.trim()) return plans;
    
    const searchLower = searchQuery.toLowerCase();
    return plans.filter(plan => 
      plan.title?.toLowerCase().includes(searchLower) ||
      plan.description?.toLowerCase().includes(searchLower)
    );
  }, [categorizedPlans, filter, searchQuery]);

  return {
    plans: filteredPlans,
    categorizedPlans,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    isLoading: isInitialLoading,
    isLoadingAdditional,
    createNewPlan: () => createNewPlan.mutate(),
    counts: {
      all: userPlans.length + invitedPlans.length,
      draft: categorizedPlans.draft.length,
      active: categorizedPlans.active.length,
      completed: categorizedPlans.completed.length,
      invited: categorizedPlans.invited.length
    }
  };
}