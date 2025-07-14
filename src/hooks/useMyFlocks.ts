import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import type { Vibe } from "@/types";

export interface MyFloq {
  id: string;
  title: string;
  name?: string;
  primary_vibe: Vibe;
  participant_count: number;
  role: string;
  joined_at: string;
  last_activity_at: string;
  starts_at?: string;
  ends_at?: string;
  creator_id?: string;
  distance_meters?: number;
  is_creator: boolean;
}

interface UseMyFlocksOptions {
  limit?: number;
  enabled?: boolean;
}

export const useMyFlocks = () => {
  const { session } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ['my-floqs-unread', userId],                // ✅ single source-of-truth key
    queryFn: async () => {
      if (!userId) return [];                   // hooks will re-run when session appears

      const { data, error } = await supabase
        .from('floq_participants')
        .select(`
            floqs: floqs (
              id, title, name, primary_vibe, creator_id, starts_at, ends_at, last_activity_at, flock_type, deleted_at
            ),
            role,
            joined_at
        `)
        .eq('user_id', userId)
        .is('floqs.deleted_at', null)
        .or('floqs.ends_at.is.null,floqs.ends_at.gt.now()');    // ⚡ persistent OR active momentary

      if (error) throw error;

      const floqData = data ?? [];
      
      // Filter out any records where floqs is null
      const validFloqData = floqData.filter(item => item.floqs !== null);
      
      if (validFloqData.length === 0) return [];

      // Get participant counts for all flocks
      const floqIds = validFloqData.map(item => item.floqs.id);
      const { data: participantData } = await supabase
        .from('floq_participants')
        .select('floq_id')
        .in('floq_id', floqIds);

      const participantCounts = participantData?.reduce((acc, item) => {
        acc[item.floq_id] = (acc[item.floq_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Transform to MyFloq format
      const result: MyFloq[] = validFloqData.map(item => ({
        id: item.floqs.id,
        title: item.floqs.title,
        name: item.floqs.name || undefined,
        primary_vibe: item.floqs.primary_vibe,
        participant_count: participantCounts[item.floqs.id] || 0,
        role: item.role,
        joined_at: item.joined_at,
        last_activity_at: item.floqs.last_activity_at || item.floqs.starts_at,
        starts_at: item.floqs.starts_at || undefined,
        ends_at: item.floqs.ends_at || undefined,
        creator_id: item.floqs.creator_id || undefined,
        is_creator: item.floqs.creator_id === userId,
      }))
      .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime());

      return result;
    },
    // ensures stale [] is quickly replaced once userId arrives
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,                  // live list every min
    retry: 1,                                 // surface silent errors in console
  });
};