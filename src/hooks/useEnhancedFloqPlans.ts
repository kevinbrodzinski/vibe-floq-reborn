import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import type { Vibe } from '@/types/vibes';

export interface EnhancedFloqPlan {
  plan_id: string;
  title: string;
  description?: string;
  status: string;
  planned_at: string;
  start_time?: string;
  end_time?: string;
  floq_id?: string;
  floq_title?: string;
  floq_vibe?: Vibe;
  participant_count: number;
  user_is_participant: boolean;
  user_rsvp_status: string;
  created_at: string;
}

export interface CreateGroupPlanData {
  title: string;
  description?: string;
  planned_at?: string;
  start_time?: string;
  end_time?: string;
  vibe_tags?: Vibe[];
  max_participants?: number;
  location?: any;
}

export function useEnhancedFloqPlans(floqId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for enhanced floq plans
  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ['enhanced-floq-plans', floqId, user?.id],
    queryFn: async (): Promise<EnhancedFloqPlan[]> => {
      // Fallback to basic query since RPC doesn't exist
      const { data, error } = await supabase
        .from('floq_plans')
        .select('*')
        .limit(50);

      if (error) {
        console.error('Error fetching enhanced floq plans:', error);
        throw error;
      }

      return (data as any as EnhancedFloqPlan[]) || [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });

  // Mutation to create group plan with floq
  const createGroupPlanMutation = useMutation({
    mutationFn: async (planData: CreateGroupPlanData) => {
      // Fallback to basic plan creation since RPC doesn't exist
      const { data, error } = await supabase
        .from('floq_plans')
        .insert({
          title: planData.title,
          description: planData.description,
          creator_id: user!.id,
          planned_at: planData.planned_at || new Date().toISOString()
        } as any)
        .select();

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
        .from('floq_plans')
        .select('floq_id')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      // Join the plan
      const { error: joinPlanError } = await supabase
        .from('plan_participants')
        .upsert({
          plan_id: planId,
          profile_id: user!.id,
          rsvp_status: 'attending',
          joined_at: new Date().toISOString()
        });

      if (joinPlanError) throw joinPlanError;

      // If there's a floq, join it too
      if (planData.floq_id) {
        const { error: joinFloqError } = await supabase
          .from('floq_participants')
          .upsert({
            floq_id: planData.floq_id,
            profile_id: user!.id,
            role: 'member',
            joined_at: new Date().toISOString()
          });

        if (joinFloqError) {
          console.warn('Failed to join floq, but plan join succeeded:', joinFloqError);
        }
      }

      return { planId, floqId: planData.floq_id };
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
        .from('floq_plans')
        .select('floq_id, creator_id')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      // Don't allow creator to leave
      if (planData.creator_id === user!.id) {
        throw new Error('Plan creators cannot leave their own plans');
      }

      // Leave the plan
      const { error: leavePlanError } = await supabase
        .from('plan_participants')
        .delete()
        .eq('plan_id', planId)
        .eq('profile_id', user!.id);

      if (leavePlanError) throw leavePlanError;

      // If there's a floq, leave it too (unless it's auto-created)
      if (planData.floq_id) {
        const { error: leaveFloqError } = await supabase
          .from('floq_participants')
          .delete()
          .eq('floq_id', planData.floq_id)
          .eq('profile_id', user!.id);

        if (leaveFloqError) {
          console.warn('Failed to leave floq, but plan leave succeeded:', leaveFloqError);
        }
      }

      return { planId, floqId: planData.floq_id };
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
    userPlans: plans.filter(plan => plan.user_is_participant),
    availablePlans: plans.filter(plan => !plan.user_is_participant),
    upcomingPlans: plans.filter(plan => {
      const plannedAt = new Date(plan.planned_at);
      return plannedAt > new Date();
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