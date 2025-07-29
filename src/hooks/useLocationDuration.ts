import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

export const useLocationDuration = (profileId: string | undefined) => {
  return useQuery({
    queryKey: ['location-duration', profileId],
    queryFn: async () => {
      if (!profileId) return null;

      // First try to get venue presence (check-in based)
      const { data: venuePresence } = await supabase
        .from('venue_live_presence')
        .select('checked_in_at, last_heartbeat, expires_at')
        .eq('profile_id', profileId)
        .gt('expires_at', new Date().toISOString())
        .order('last_heartbeat', { ascending: false })
        .limit(1)
        .single();

      if (venuePresence?.checked_in_at) {
        const startTime = new Date(venuePresence.checked_in_at);
        const duration = formatDistanceToNow(startTime, { addSuffix: false });
        return {
          duration,
          startTime,
          type: 'checkin' as const
        };
      }

      // Fallback to general presence (location ping based)
      const { data: presence } = await supabase
        .from('presence')
        .select('started_at, updated_at')
        .eq('profile_id', profileId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (presence?.started_at) {
        const startTime = new Date(presence.started_at);
        const duration = formatDistanceToNow(startTime, { addSuffix: false });
        return {
          duration,
          startTime,
          type: 'presence' as const
        };
      }

      return null;
    },
    enabled: !!profileId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
};