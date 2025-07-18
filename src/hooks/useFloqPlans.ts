
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FloqPlan {
  id: string;
  floq_id: string;
  creator_id: string;
  title: string;
  description?: string;
  planned_at: string;
  end_at?: string;
  location?: any;
  max_participants?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useFloqPlans(floqId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['floq-plans', floqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floq_plans')
        .select('*')
        .eq('floq_id', floqId)
        .order('planned_at', { ascending: true });

      if (error) throw error;
      return data as FloqPlan[];
    },
    enabled: !!floqId,
  });

  // Real-time subscription for plan changes
  useEffect(() => {
    if (!floqId) return;

    const channel = supabase
      .channel(`floq_plans:${floqId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public',
          table: 'floq_plans', 
          filter: `floq_id=eq.${floqId}` 
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['floq-plans', floqId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [floqId, queryClient]);

  return query;
}
