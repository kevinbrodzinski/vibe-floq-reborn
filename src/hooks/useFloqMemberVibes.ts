
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useFloqMemberVibes = (floqId: string) => {
  return useQuery({
    queryKey: ['floq-member-vibes', floqId],
    queryFn: async () => {
      // Get current vibes for floq members
      const { data: participants } = await supabase
        .from('floq_participants')
        .select('profile_id')
        .eq('floq_id', floqId);

      if (!participants?.length) return [];

      const userIds = participants.map(p => p.user_id);
      
      const { data: vibes, error } = await supabase
        .from('user_vibe_states')
        .select('profile_id, vibe_tag, started_at, location')
        .in('profile_id', userIds)
        .eq('active', true)
        .gte('started_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()); // Last 2 hours

      if (error) throw error;
      
      return vibes || [];
    },
    enabled: !!floqId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
