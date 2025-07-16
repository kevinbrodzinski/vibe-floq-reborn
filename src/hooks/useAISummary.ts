import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAISummary() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateSummary = async (planId: string) => {
    if (!planId) {
      toast({
        title: "Error",
        description: "Plan ID is required",
        variant: "destructive"
      });
      return null;
    }

    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-plan-summary', {
        body: { plan_id: planId }
      });

      if (error) {
        console.error('AI summary error:', error);
        toast({
          title: "Summary Generation Failed",
          description: "Unable to generate AI summary. Please try again.",
          variant: "destructive"
        });
        return null;
      }

      if (data?.success && data?.summary) {
        toast({
          title: "Summary Generated",
          description: "AI summary has been created for your plan!",
        });
        return data.summary;
      }

      return null;
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: "Error",
        description: "Failed to generate summary",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateSummary,
    isGenerating
  };
}