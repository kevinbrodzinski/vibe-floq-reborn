import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

type FlowSegmentRow = Database['public']['Tables']['flow_segments']['Row'];

export function useFlowSegments(flowId: string) {
  return useQuery<FlowSegmentRow[]>({
    queryKey: ['flow-segments', flowId],
    enabled: !!flowId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<FlowSegmentRow[]> => {
      const { data, error } = await supabase
        .from('flow_segments')
        .select('*')
        .eq('flow_id', flowId)
        .order('idx', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}