import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';

export interface ActiveFloq {
  id: string;
  title: string;
  name?: string;
  primary_vibe?: string;
  member_count?: number;
}

export function useMyActiveFloqs() {
  const session = useSession();
  
  return useQuery({
    queryKey: ['my-active-floqs', session?.user?.id],
    queryFn: async (): Promise<ActiveFloq[]> => {
      if (!session?.user?.id) return [];

      // ISO string *once* – avoids drifting between async calls
      const nowISO = new Date().toISOString();

      // ① Get the floq ids the user belongs to
      const { data: ids, error: idErr } = await supabase
        .from('floq_participants')
        .select('floq_id')
        .eq('user_id', session.user.id);

      if (idErr) throw idErr;
      if (!ids?.length) return [];

      // ② Pull the actual floq rows, filtering for "active"
      const { data: floqs, error: floqErr } = await supabase
        .from('floqs')
        .select(`
          id, 
          title, 
          name, 
          primary_vibe
        `)
        .in('id', ids.map(r => r.floq_id))
        .is('deleted_at', null)
        .is('archived_at', null)                // new guard for archived floqs
        // ends_at is either NULL **or** in the future (floqs use ends_at, not disband_at)
        .or(`ends_at.is.null,ends_at.gt.${nowISO}`);

      if (floqErr) throw floqErr;
      
      // Get member counts for each floq
      const floqsWithCounts = await Promise.all(
        (floqs ?? []).map(async (floq) => {
          const { count } = await supabase
            .from('floq_participants')
            .select('*', { count: 'exact', head: true })
            .eq('floq_id', floq.id);
            
          return {
            ...floq,
            member_count: count || 0
          };
        })
      );
      
      return floqsWithCounts;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}