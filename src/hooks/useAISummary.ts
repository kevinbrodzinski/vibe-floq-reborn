import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAISummary = (afterglowId: string) => {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('generate-intelligence', {
        body: { mode: 'afterglow', afterglow_id: afterglowId }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Summary Generated",
        description: "AI summary has been created for your afterglow!",
      });
    },
    onError: (error) => {
      toast({
        title: "Summary Generation Failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
  });
};