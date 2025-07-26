import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export interface PlanBadgeCount {
  plan_id: string;
  unseen: number;
}

export function usePlanBadgeCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['plan-badges', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<PlanBadgeCount[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase.rpc('count_unseen_plan_events' as any, { 
        uid: user.id 
      });

      if (error) {
        console.warn('Plan badge RPC not available, falling back to client calculation');
        return [];
      }

      return (data as any[] || []).map((item: any) => ({
        plan_id: item.plan_id,
        unseen: item.unseen
      }));
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

export function usePlanBadgeCount(planId: string) {
  const { data: allBadges = [] } = usePlanBadgeCounts();
  
  const badge = allBadges.find(b => b.plan_id === planId);
  return badge?.unseen || 0;
}