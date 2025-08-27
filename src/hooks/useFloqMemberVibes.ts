import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type FP = Database['public']['Tables']['floq_participants']['Row'];
type UVS = Database['public']['Tables']['user_vibe_states']['Row'];
type ProfileId = Database['public']['Tables']['profiles']['Row']['id'];

type MemberVibe = Pick<UVS, 'profile_id' | 'vibe_tag' | 'active' | 'started_at'>;

export const useFloqMemberVibes = (floqId: string) => {
  return useQuery<MemberVibe[]>({
    queryKey: ['floq-member-vibes', floqId],
    queryFn: async (): Promise<MemberVibe[]> => {
      // Get current vibes for floq members
      const { data: participants, error: pErr } = await supabase
        .from('floq_participants')
        .select('profile_id')
        .eq('floq_id', floqId as any)
        .returns<Array<Pick<FP, 'profile_id'>>>();
      
      if (pErr) throw pErr;
      const ids = (participants ?? [])
        .map(p => p.profile_id)
        .filter(Boolean) as ProfileId[];

      if (ids.length === 0) return [];

      const { data: vibes, error } = await supabase
        .from('user_vibe_states')
        .select('profile_id, vibe_tag, active, started_at')
        .in('profile_id', ids as any)
        .eq('active', true as any)
        .gte('started_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .returns<MemberVibe[]>();

      if (error) throw error;
      
      return vibes || [];
    },
    enabled: !!floqId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};