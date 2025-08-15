import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedUserPlans } from './useOptimizedUserPlans';
import { useOptimizedInvitedPlans } from './useOptimizedInvitedPlans';

export type PlanFilter = 'all' | 'draft' | 'active' | 'completed' | 'invited';
export type SortBy = 'name' | 'date' | 'type' | 'distance';
export type SortOrder = 'asc' | 'desc';

// Progressive loading hook that loads user plans first, then invited plans
export function useProgressivePlansData() {
  const [filter, setFilter] = useState<PlanFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
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

  // Optimized filter, search, and sort
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

    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      plans = plans.filter(plan => 
        plan.title?.toLowerCase().includes(searchLower) ||
        plan.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    plans.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'date':
          const dateA = new Date(a.planned_at || a.starts_at || 0).getTime();
          const dateB = new Date(b.planned_at || b.starts_at || 0).getTime();
          comparison = dateA - dateB;
          break;
        case 'type':
          const statusA = a.status || 'draft';
          const statusB = b.status || 'draft';
          comparison = statusA.localeCompare(statusB);
          break;
        case 'distance':
          // For now, sort by location if available, otherwise by title
          const locationA = a.location?.toString() || a.title || '';
          const locationB = b.location?.toString() || b.title || '';
          comparison = locationA.localeCompare(locationB);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return plans;
  }, [categorizedPlans, filter, searchQuery, sortBy, sortOrder]);

  return {
    plans: filteredPlans,
    categorizedPlans,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
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