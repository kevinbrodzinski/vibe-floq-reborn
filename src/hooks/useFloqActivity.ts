import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FloqActivity {
  id: string;
  floq_id: string;
  plan_id?: string;
  user_id?: string;
  guest_name?: string;
  kind: 'created' | 'edited' | 'commented';
  content?: string;
  created_at: string;
}

export function useFloqActivity(floqId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['floq-activity', floqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floq_activity')
        .select('*')
        .eq('floq_id', floqId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as FloqActivity[];
    },
    enabled: !!floqId,
    staleTime: 60_000
  });

  // Live subscription for real-time updates
  useEffect(() => {
    if (!floqId) return;
    
    const channel = supabase
      .channel(`floq-activity-${floqId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'floq_activity', 
        filter: `floq_id=eq.${floqId}` 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['floq-activity', floqId] });
      })
      .subscribe();
    
    return () => void channel.unsubscribe();
  }, [floqId, queryClient]);

  return { 
    activity: data ?? [], 
    isLoading 
  };
}