import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePrefetchFloq = () => {
  const queryClient = useQueryClient();
  
  return (floqId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['floq-details', floqId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('floqs')
          .select(`
            id,
            title,
            primary_vibe,
            starts_at,
            ends_at,
            max_participants,
            creator_id,
            profiles!floqs_creator_id_fkey(display_name, avatar_url),
            floq_participants(user_id)
          `)
          .eq('id', floqId)
          .single();
        
        if (error) throw error;
        if (!data) throw new Error('Floq not found');
        
        return data;
      },
      staleTime: 60_000, // 1 minute
    });
  };
};