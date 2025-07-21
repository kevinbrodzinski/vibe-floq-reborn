import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlanMeta {
  total_stops: number;
  confirmed_stops: number;
  participant_count: number;
  total_duration_minutes: number;
  estimated_cost_per_person: number;
}

export function usePlanMeta(planId: string, enabled = true) {
  return useQuery<PlanMeta>({
    queryKey: ['plan-meta', planId],
    enabled: enabled && !!planId,
    staleTime: 1000 * 60 * 5, // 5 min
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_plan_metadata' as any, { p_plan_id: planId })
        .single();
      if (error) throw error;
      return data as PlanMeta;
    },
  });
}