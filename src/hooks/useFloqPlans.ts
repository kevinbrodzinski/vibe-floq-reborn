import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlanStatus } from '@/types/enums/planStatus';
import type { Database } from '@/integrations/supabase/types';

export interface FloqPlan {
  id: string;
  title: string;
  description?: string;
  status: PlanStatus;
  planned_at: string;
  created_at: string;
  creator_id: string;
  floq_id: string;
  start_time?: string;
  end_time?: string;
  max_participants?: number;
}

type PlanRow = Database['public']['Tables']['floq_plans']['Row'];
type FloqId = PlanRow['floq_id'];

export function useFloqPlans(floqId: string) {
  return useQuery<FloqPlan[]>({
    queryKey: ['floq-plans', floqId],
    queryFn: async (): Promise<FloqPlan[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id || !floqId) return [];

      const { data, error } = await supabase
        .from('floq_plans')
        .select('*')
        .eq('floq_id', floqId as any)
        .order('planned_at', { ascending: true })
        .returns<PlanRow[]>();

      if (error) throw error;
      // Map DB → domain type if your FloqPlan differs; otherwise cast
      return (data || []) as unknown as FloqPlan[];
    },
    enabled: !!floqId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}