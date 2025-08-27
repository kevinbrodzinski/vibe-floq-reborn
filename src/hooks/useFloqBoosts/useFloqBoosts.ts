import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFloqBoosts(floqId: string) {
  return useQuery({
    queryKey: ['floq-boosts', floqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floq_boosts')
        .select('*')
        .eq('floq_id', floqId as any)
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!floqId,
  });
}