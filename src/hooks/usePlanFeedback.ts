import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface PlanFeedback {
  id: string;
  plan_id: string;
  profile_id: string;
  vibe_rating?: number;
  favorite_moment?: string;
  would_repeat?: boolean;
  created_at: string;
}

export interface PlanFeedbackInput {
  vibe_rating?: number;
  favorite_moment?: string;
  would_repeat?: boolean;
}

export function usePlanFeedback(planId: string) {
  return useQuery({
    queryKey: ['plan-feedback', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_feedback')
        .select('*')
        .eq('plan_id', planId as any)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as PlanFeedback[];
    },
    enabled: !!planId,
  });
}

export function useMyPlanFeedback(planId: string) {
  return useQuery({
    queryKey: ['my-plan-feedback', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_feedback')
        .select('*')
        .eq('plan_id', planId as any)
        .eq('profile_id', (await supabase.auth.getUser()).data.user?.id as any)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as PlanFeedback | null;
    },
    enabled: !!planId,
  });
}

export function useSubmitPlanFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      planId, 
      feedback 
    }: { 
      planId: string; 
      feedback: PlanFeedbackInput; 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('plan_feedback')
        .upsert({
          plan_id: planId,
          profile_id: user.id,
          ...feedback,
        } as any);

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: ['plan-feedback', planId] });
      queryClient.invalidateQueries({ queryKey: ['my-plan-feedback', planId] });
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for sharing your thoughts!',
      });
    },
    onError: (error) => {
      console.error('Failed to submit feedback:', error);
      toast({
        title: 'Submission Failed',
        description: 'Could not save your feedback. Please try again.',
        variant: 'destructive',
      });
    },
  });
}