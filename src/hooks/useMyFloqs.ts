import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export interface MyFloq {
  id: string;
  title: string;
  name?: string;
  description?: string;
  primary_vibe: string;
  created_at: string;
  starts_at: string;
  ends_at?: string;
  creator_id: string;
  participant_count?: number;
}

export function useMyFloqs() {
  return useQuery({
    queryKey: ['my-floqs'],
    queryFn: async (): Promise<MyFloq[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('floqs')
        .select(`
          id,
          title,
          name,
          description,
          primary_vibe,
          created_at,
          starts_at,
          ends_at,
          creator_id,
          floq_participants!inner(profile_id)
        `)
        .eq('floq_participants.profile_id', user.id as any)
        .eq('visibility', 'public' as any)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .returns<(MyFloq & { floq_participants: any[] })[]>();

      if (error) throw error;

      // Transform data to include participant count
      return data.map(floq => ({
        ...floq,
        participant_count: floq.floq_participants?.length || 0,
        floq_participants: undefined // Remove the join data from final result
      }));
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}