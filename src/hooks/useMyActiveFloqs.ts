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
        .select('id, title, name')
        .in('id', ids.map(r => r.floq_id))
        .is('deleted_at', null)
        // disband_at is either NULL **or** in the future
        .or(`disband_at.is.null,disband_at.gt.${nowISO}`);

      if (floqErr) throw floqErr;
      return floqs ?? [];
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}