import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';

export interface ActiveFloq {
  id: string;
  title: string;
  name?: string;
}

export function useMyActiveFloqs() {
  const session = useSession();
  
  return useQuery({
    queryKey: ['my-active-floqs', session?.user?.id],
    queryFn: async (): Promise<ActiveFloq[]> => {
      if (!session?.user?.id) return [];

      const { data, error } = await supabase
        .from('floq_participants')
        .select(`
          floq:floqs!inner(
            id, title, name
          )
        `)
        .eq('user_id', session.user.id)
        .is('floq.deleted_at', null)
        .is('floq.archived_at', null)
        .or('floq.disband_at.is.null,floq.disband_at.gt.now()');

      if (error) throw error;
      return (data ?? []).map(r => r.floq);
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}