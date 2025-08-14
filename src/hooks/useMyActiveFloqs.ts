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

export function useMyActiveFloqs(timeWindow?: { start: Date; end: Date }) {
  const session = useSession();
  
  return useQuery({
    queryKey: ['my-active-floqs', session?.user?.id, timeWindow?.start?.toISOString(), timeWindow?.end?.toISOString()],
    queryFn: async (): Promise<ActiveFloq[]> => {
      if (!session?.user?.id) return [];

      // Use provided time window or default to now
      const startISO = timeWindow?.start?.toISOString() || new Date().toISOString();
      const endISO = timeWindow?.end?.toISOString() || new Date().toISOString();

      // ① Get the floq ids the user belongs to
      const { data: ids, error: idErr } = await supabase
        .from('floq_participants')
        .select('floq_id')
        .eq('profile_id', session.user.id);

      if (idErr) throw idErr;
      if (!ids?.length) return [];

      // ② Pull the actual floq rows with member counts using foreign table syntax
      const { data: floqs, error: floqErr } = await supabase
        .from('floqs')
        .select(`
          id, 
          title, 
          name, 
          primary_vibe,
          floq_participants(count)
        `)
        .in('id', ids.map(r => r.floq_id))
        .is('deleted_at', null)
        .is('archived_at', null)                // new guard for archived floqs
        // ends_at is either NULL **or** overlaps with our time window
        .or(`ends_at.is.null,ends_at.gte.${startISO}`)
        // Optional: also filter by start time if floqs have start times
        // .or(`starts_at.is.null,starts_at.lte.${endISO}`);

      if (floqErr) throw floqErr;
      
      // Transform the data to match ActiveFloq interface
      const transformedFloqs = (floqs ?? []).map(floq => ({
        id: floq.id,
        title: floq.title,
        name: floq.name,
        primary_vibe: floq.primary_vibe,
        member_count: floq.floq_participants?.[0]?.count || 0
      }));
      
      return transformedFloqs;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}