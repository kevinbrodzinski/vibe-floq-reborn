
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

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['floq-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floq_plans')
        .select(`
          *,
          floqs!inner(title, creator_id),
          floq_participants!inner(user_id)
        `)
        .eq('floq_participants.user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;
      return data || [];
    }
  });

  const createNewPlan = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Create a simple draft plan
      const { data, error } = await supabase
        .from('floq_plans')
        .insert({
          title: 'Untitled Plan',
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
      queryClient.invalidateQueries({ queryKey: ['floq-plans'] });
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

  const filteredPlans = useMemo(() => {
    let filtered = plans;
    
    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(plan => plan.status === filter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(plan => 
        plan.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [plans, filter, searchQuery]);

  return {
    plans,
    filteredPlans,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    isLoading,
    createNewPlan: () => createNewPlan.mutate()
  };
}
