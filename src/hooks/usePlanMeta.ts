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
    staleTime: 5 * 60 * 1000, // 5 min
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_plan_metadata', { p_plan_id: planId })
        .single();
      if (error) throw error;
      return {
        total_stops: Number((data as any).total_stops),
        confirmed_stops: Number((data as any).confirmed_stops),
        participant_count: Number((data as any).participant_count),
        total_duration_minutes: Number((data as any).total_duration_minutes),
        estimated_cost_per_person: Number((data as any).estimated_cost_per_person),
      } as PlanMeta;
    },
  });
}