import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

type FlowRow = Database['public']['Tables']['flows']['Row'];

export function useFlow(flowId: string) {
  return useQuery<FlowRow>({
    queryKey: ['flow', flowId],
    enabled: !!flowId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<FlowRow> => {
      const { data, error } = await supabase
        .from('flows')
        .select('*')
        .eq('id', flowId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Flow not found');
      return data;
    },
  });
}