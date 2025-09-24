import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type PlanRow = Database['public']['Tables']['floq_plans']['Row'];
type FloqId = PlanRow['floq_id'];
type PlanStatus = PlanRow['status'];

export function useFloqPlanDetection(floqId: string) {
  return useQuery<boolean>({
    queryKey: ['floq-plan-detection', floqId],
    queryFn: async (): Promise<boolean> => {
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);

      const { data, error } = await supabase
        .from('floq_plans')
        .select('id, planned_at, status')
        .eq('floq_id', floqId as any)
        .gte('planned_at', startOfToday.toISOString())
        .lte('planned_at', endOfToday.toISOString())
        .in('status', ['draft', 'active'] as any)
        .limit(1)
        .returns<Pick<PlanRow, 'id' | 'planned_at' | 'status'>[]>();

      if (error) {
        console.error('Error checking floq plans:', error);
        return false;
      }

      return (data && data.length > 0);
    },
    enabled: !!floqId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}