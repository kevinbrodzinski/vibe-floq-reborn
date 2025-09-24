import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTriggerEval() {
  return useCallback(async (payload: {
    plan_id: string;
    active_path_id: "A" | "B" | "C";
    candidate_paths: { A: string; B?: string | null; C?: string | null };
    trigger_rules: { crowdLevel?: number; rainProbPct?: number; };
    weather?: { rainProbPct?: number } | null;
  }) => {
    const { data, error } = await supabase.functions.invoke('evaluate-triggers', {
      body: {
        ...payload,
        context: {
          weather: payload.weather ?? null,
          nowISO: new Date().toISOString()
        }
      }
    });
    
    if (error) {
      console.error('Trigger evaluation error:', error);
      const message = error?.message ?? error?.error?.message ?? 'Something went wrong on the server';
      throw new Error(message);
    }
    
    return data;
  }, []);
}