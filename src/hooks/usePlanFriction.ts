import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePlanFriction() {
  return useCallback(async (plan_id: string, paths: any[], budget_per_person?: number | null) => {
    const { data, error } = await supabase.functions.invoke('compute-friction', {
      body: { plan_id, paths, budget_per_person }
    });
    
    if (error) {
      console.error('Plan friction error:', error);
      const message = error?.message ?? error?.error?.message ?? 'Something went wrong on the server';
      throw new Error(message);
    }
    
    return data as { results: any[] };
  }, []);
}