
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useFloqMembers = (floqId: string) => {
  return useQuery({
    queryKey: ['floq-members', floqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floq_participants')
        .select(`
          user_id,
          role,
          joined_at,
          profiles!inner (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('floq_id', floqId);

      if (error) throw error;
      
      return data.map(participant => ({
        user_id: participant.user_id,
        role: participant.role,
        joined_at: participant.joined_at,
        profile: participant.profiles
      }));
    },
    enabled: !!floqId
  });
};
