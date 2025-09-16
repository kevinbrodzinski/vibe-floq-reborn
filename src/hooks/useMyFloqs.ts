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

      // Fetch floqs where user is either creator OR participant
      const [createdFloqs, joinedFloqs] = await Promise.all([
        // Floqs created by user
        supabase
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
            creator_id
          `)
          .eq('creator_id', user.id)
          .is('deleted_at', null),
        
        // Floqs joined by user (as participant)
        supabase
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
          .neq('creator_id', user.id) // Don't duplicate created floqs
          .is('deleted_at', null)
      ]);

      if (createdFloqs.error) throw createdFloqs.error;
      if (joinedFloqs.error) throw joinedFloqs.error;

      const allFloqs = [
        ...(createdFloqs.data || []).map(f => ({ ...f, participant_count: 1 })),
        ...(joinedFloqs.data || []).map(f => ({ 
          ...f, 
          participant_count: f.floq_participants?.length || 0,
          floq_participants: undefined 
        }))
      ];

      // Debug logging
      if (import.meta.env.DEV && allFloqs.length > 0) {
        console.log("[useMyFloqs] User's floqs found:", allFloqs.map(f => ({
          id: f.id,
          title: f.title,
          created_at: f.created_at,
          creator_id: f.creator_id
        })));
      }

      return allFloqs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}