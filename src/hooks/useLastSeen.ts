import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useLastSeen(profileId: string | undefined) {
  const { data } = useQuery({
    queryKey: ['last-seen', profileId || 'no-profile'],
    enabled: Boolean(profileId && profileId.length > 0), // Don't run if profileId is empty or undefined
    queryFn: async () => {
      if (!profileId) return null;
      
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
      return data?.last_seen_at || null; // Always return string | null, never undefined
    },
    refetchInterval: 30_000,
    staleTime: 10_000 // Prevent excessive refetching
  });
  return data ?? null; // Ensure we never return undefined
}