import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useLastSeen(profileId: string) {
  const { data } = useQuery({
    queryKey: ['last-seen', profileId],
    enabled: !!profileId, // Don't run if profileId is empty
    queryFn: async () => {
      // Get the current user to filter the view correctly
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('v_friend_last_seen')
        .select('last_seen_at')
        .eq('current_profile_id', user.id)
        .eq('other_profile_id', profileId)
        .maybeSingle();
      
      if (error) throw error;
      return data?.last_seen_at;
    },
    refetchInterval: 30_000
  });
  return data; // ISO timestamp | undefined
}