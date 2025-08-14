
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PlanFilter = 'all' | 'draft' | 'active' | 'completed' | 'invited';

export function usePlansData() {
  const [filter, setFilter] = useState<PlanFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's plans
  const { data: userPlans = [], isLoading: isLoadingUserPlans } = useQuery({
    queryKey: ['user-floq-plans'],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_user_plans')
        .select('*')
        .throwOnError();
      
      return data || [];
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch invited plans
  const { data: invitedPlans = [], isLoading: isLoadingInvited } = useQuery({
    queryKey: ['invited-floq-plans'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('plan_participants')
        .select(`
          plan_id,
          floq_plans(
            *,
            floqs!floq_plans_floq_id_fkey(title, creator_id, location),
            creator:profiles!creator_id(id, display_name, username, avatar_url)
          )
        `)
        .eq('profile_id', user.user.id)
        .neq('floq_plans.creator_id', user.user.id);

      if (error) throw error;
      return data?.map(item => item.floq_plans).filter(Boolean) || [];
    }
  });

  const isLoading = isLoadingUserPlans || isLoadingInvited;

  // Combine and categorize plans
  const categorizedPlans = useMemo(() => {
    // TODO: restore when view is available
    const draft: any[] = [];
    const active: any[] = [];
    const completed: any[] = [];
    const invited = invitedPlans;

    return { draft, active, completed, invited };
  }, [userPlans, invitedPlans]);

  const createNewPlan = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Create a solo plan without linking to a floq
      const { data, error } = await supabase
        .from('floq_plans')
        .insert({
          title: 'Untitled Plan',
          floq_id: null, // Solo plan
          creator_id: user.user.id,
          status: 'draft',
          planned_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-floq-plans'] });
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

  // Filter and search functionality
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
      plans = plans.filter(plan => 
        plan.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return plans;
  }, [categorizedPlans, filter, searchQuery]);

  return {
    plans: filteredPlans,
    categorizedPlans,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    isLoading,
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
