
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type FP = Database['public']['Tables']['floq_participants']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type FloqId = FP['floq_id'];

type Joined = Pick<FP, 'profile_id' | 'role' | 'joined_at'> & {
  profiles: Pick<Profile,'id'|'username'|'display_name'|'avatar_url'> | null;
};

export const useFloqMembers = (floqId: string) => {
  return useQuery<Joined[]>({
    queryKey: ['floq-members', floqId],
    queryFn: async (): Promise<Joined[]> => {
      const { data, error } = await supabase
        .from('floq_participants')
        .select(`
          profile_id,
          role,
          joined_at,
          profiles:profile_id ( id, username, display_name, avatar_url )
        `)
        .eq('floq_id', floqId as any)
        .returns<Joined[]>();

      if (error) throw error;

      return (data ?? []).map(participant => ({
        profile_id: participant.profile_id,
        role: participant.role,
        joined_at: participant.joined_at,
        profiles: participant.profiles
      }));
    },
    enabled: !!floqId
  });
};
