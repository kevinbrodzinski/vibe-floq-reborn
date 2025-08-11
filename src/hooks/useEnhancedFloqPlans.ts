import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Vibe } from '@/lib/vibes';

export interface EnhancedFloqPlan {
  id: string;
  title: string;
  description: string;
  status: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
  creator_id: string;
  floq_id: string;
  participant_count: number;
  user_rsvp_status: string;
}

export interface CreateGroupPlanData {
  title: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  floq_title?: string;
  floq_description?: string;
}

export function useEnhancedFloqPlans(floqId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for enhanced floq plans
  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ['enhanced-floq-plans', floqId, user?.id],
    queryFn: async (): Promise<EnhancedFloqPlan[]> => {
      const { data, error } = await supabase.rpc('get_floq_plans_enhanced', {
        p_profile_id: user?.id!
      });

      if (error) {
        console.error('Error fetching enhanced floq plans:', error);
        throw error;
      }

      return (Array.isArray(data) ? (data as any[]) : []) as any;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });

  // Mutation to create group plan with floq
  const createGroupPlanMutation = useMutation({
    mutationFn: async (planData: CreateGroupPlanData) => {
      const { data, error } = await supabase.rpc('create_group_plan_with_floq', {
        p_title: planData.title,
        p_description: planData.description || null,
        p_starts_at: planData.starts_at || null,
        p_ends_at: planData.ends_at || null,
        p_floq_title: planData.floq_title || null,
        p_floq_description: planData.floq_description || null
      });

      if (error) {
        console.error('Error creating group plan with floq:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['enhanced-floq-plans'] });
      queryClient.invalidateQueries({ queryKey: ['walkable'] }); // Refresh nearby floqs
      queryClient.invalidateQueries({ queryKey: ['floq-details'] });
      
      toast({
        title: 'Group Plan Created!',
        description: 'Your group plan and floq have been created successfully.',
      });

      return data;
    },
    onError: (error: any) => {
      console.error('Error creating group plan:', error);
      toast({
        title: 'Failed to Create Plan',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  // Mutation to join a plan (and its floq)
  const joinPlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      // First, get the plan details to find the floq_id
      const { data: planData, error: planError } = await supabase
        .from('floq_plans' as any)
        .select('floq_id')
        .eq('id', planId as any)
        .single();

      if (planError) throw planError;

      // Join the plan
      const { error: joinPlanError } = await supabase
        .from('plan_participants' as any)
        .upsert({
          plan_id: planId,
          profile_id: user!.id,
          rsvp_status: 'attending',
          joined_at: new Date().toISOString()
        } as any);

      if (joinPlanError) throw joinPlanError;

      // If there's a floq, join it too
      if ((planData as any).floq_id) {
        const { error: joinFloqError } = await supabase
          .from('floq_participants' as any)
          .upsert({
            floq_id: (planData as any).floq_id,
            profile_id: user!.id,
            role: 'member',
            joined_at: new Date().toISOString()
          } as any);

        if (joinFloqError) {
          console.warn('Failed to join floq, but plan join succeeded:', joinFloqError);
        }
      }

      return { planId, floqId: (planData as any).floq_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-floq-plans'] });
      queryClient.invalidateQueries({ queryKey: ['walkable'] });
      
      toast({
        title: 'Joined Plan!',
        description: 'You have successfully joined the plan and group.',
      });
    },
    onError: (error: any) => {
      console.error('Error joining plan:', error);
      toast({
        title: 'Failed to Join Plan',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  // Mutation to leave a plan (and its floq)
  const leavePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      // First, get the plan details to find the floq_id
      const { data: planData, error: planError } = await supabase
        .from('floq_plans' as any)
        .select('floq_id, creator_id')
        .eq('id', planId as any)
        .single();

      if (planError) throw planError;

      // Don't allow creator to leave
      if ((planData as any).creator_id === user!.id) {
        throw new Error('Plan creators cannot leave their own plans');
      }

      // Leave the plan
      const { error: leavePlanError } = await supabase
        .from('plan_participants' as any)
        .delete()
        .eq('plan_id', planId as any)
        .eq('profile_id', user!.id as any);

      if (leavePlanError) throw leavePlanError;

      // If there's a floq, leave it too (unless it's auto-created)
      if ((planData as any).floq_id) {
        const { error: leaveFloqError } = await supabase
          .from('floq_participants' as any)
          .delete()
          .eq('floq_id', (planData as any).floq_id as any)
          .eq('profile_id', user!.id as any);

        if (leaveFloqError) {
          console.warn('Failed to leave floq, but plan leave succeeded:', leaveFloqError);
        }
      }

      return { planId, floqId: (planData as any).floq_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-floq-plans'] });
      queryClient.invalidateQueries({ queryKey: ['walkable'] });
      
      toast({
        title: 'Left Plan',
        description: 'You have left the plan and group.',
      });
    },
    onError: (error: any) => {
      console.error('Error leaving plan:', error);
      toast({
        title: 'Failed to Leave Plan',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  return {
    plans,
    isLoading,
    error: error?.message || null,
    
    // Actions
    createGroupPlan: createGroupPlanMutation.mutate,
    joinPlan: joinPlanMutation.mutate,
    leavePlan: leavePlanMutation.mutate,
    
    // Status
    isCreatingPlan: createGroupPlanMutation.isPending,
    isJoiningPlan: joinPlanMutation.isPending,
    isLeavingPlan: leavePlanMutation.isPending,
    
    // Computed values
    userPlans: plans.filter(plan => plan.user_rsvp_status === 'attending' || plan.user_rsvp_status === 'maybe'),
    availablePlans: plans.filter(plan => plan.user_rsvp_status === 'pending' || plan.user_rsvp_status === 'not_attending'),
    upcomingPlans: plans.filter(plan => {
      const startsAt = new Date(plan.starts_at);
      return startsAt > new Date();
    }),
    
    // Helper functions
    getPlansByFloq: (targetFloqId: string) => 
      plans.filter(plan => plan.floq_id === targetFloqId),
    
    getPlansByStatus: (status: string) => 
      plans.filter(plan => plan.status === status),
  };
}

// Hook for a specific floq's plans
export function useFloqPlans(floqId: string) {
  return useEnhancedFloqPlans(floqId);
}

// Hook for all user's plans
export function useUserPlans() {
  const result = useEnhancedFloqPlans();
  
  return {
    ...result,
    plans: result.userPlans, // Only return user's plans
  };
}