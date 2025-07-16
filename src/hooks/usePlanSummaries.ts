import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type SummaryMode = 'finalized' | 'afterglow';

export interface PlanSummary {
  id: string;
  plan_id: string;
  mode: SummaryMode;
  summary: string;
  generated_at: string;
  created_at: string;
}

export function usePlanSummaries(planId: string) {
  return useQuery({
    queryKey: ['plan-summaries', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_summaries')
        .select('*')
        .eq('plan_id', planId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PlanSummary[];
    },
    enabled: !!planId,
  });
}

export function usePlanSummary(planId: string, mode: SummaryMode) {
  return useQuery({
    queryKey: ['plan-summary', planId, mode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_summaries')
        .select('*')
        .eq('plan_id', planId)
        .eq('mode', mode)
        .maybeSingle();

      if (error) throw error;
      return data as PlanSummary | null;
    },
    enabled: !!planId && !!mode,
  });
}

export function useGeneratePlanSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, mode }: { planId: string; mode: SummaryMode }) => {
      const { data, error } = await supabase.functions.invoke('generate-plan-summary', {
        body: { plan_id: planId, mode },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: ['plan-summaries', planId] });
      toast({
        title: 'Summary Generated',
        description: 'Your plan summary has been created successfully!',
      });
    },
    onError: (error) => {
      console.error('Failed to generate summary:', error);
      toast({
        title: 'Generation Failed',
        description: 'Could not generate summary. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePlanSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      planId, 
      mode, 
      summary 
    }: { 
      planId: string; 
      mode: SummaryMode; 
      summary: string; 
    }) => {
      const { data, error } = await supabase
        .from('plan_summaries')
        .upsert({
          plan_id: planId,
          mode,
          summary,
          generated_at: new Date().toISOString(),
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: ['plan-summaries', planId] });
      toast({
        title: 'Summary Updated',
        description: 'Your changes have been saved!',
      });
    },
    onError: (error) => {
      console.error('Failed to update summary:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not save changes. Please try again.',
        variant: 'destructive',
      });
    },
  });
}