import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAISummary() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const summaryMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (!planId) {
        throw new Error("Plan ID is required");
      }

      // Add 10s timeout for OpenAI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const { data, error } = await supabase.functions.invoke('generate-intelligence', {
          body: { mode: 'plan-summary', plan_id: planId }
        });

        clearTimeout(timeoutId);

        if (error) {
          console.error('AI summary error:', error);
          throw new Error('Unable to generate AI summary');
        }

        if (!data?.success || !data?.summary) {
          throw new Error('Invalid response from AI service');
        }

        return data.summary;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        throw error;
      }
    },
    onSuccess: (summary, planId) => {
      toast({
        title: "Summary Generated",
        description: "AI summary has been created for your plan!",
      });
      
      // Invalidate plan queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['plan-summaries'] });
    },
    onError: (error) => {
      toast({
        title: "Summary Generation Failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
  });

  return {
    generateSummary: summaryMutation.mutate,
    isGenerating: summaryMutation.isPending
  };
}