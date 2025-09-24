import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

export const useLocationDuration = (profileId: string | undefined) => {
  return useQuery<{
    duration: string;
    startTime: Date;
    type: 'checkin' | 'presence';
  } | null>({
    queryKey: ['location-duration', profileId],
    queryFn: async () => {
      if (!profileId) return null;

      // First try to get venue presence (check-in based)
      const { data: venuePresence } = await supabase
        .from('venue_live_presence')
        .select('checked_in_at, last_heartbeat, expires_at')
        .eq('profile_id', profileId as any)
        .gt('expires_at', new Date().toISOString())
        .order('last_heartbeat', { ascending: false })
        .limit(1)
        .returns<{
          checked_in_at: string | null;
          last_heartbeat: string | null;
          expires_at: string | null;
        }>()
        .maybeSingle();

      if ((venuePresence as any)?.checked_in_at) {
        const startTime = new Date((venuePresence as any).checked_in_at);
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
        .eq('profile_id', profileId as any)
        .order('updated_at', { ascending: false })
        .limit(1)
        .returns<{
          started_at: string | null;
          updated_at: string | null;
        }>()
        .maybeSingle();

      if ((presence as any)?.started_at) {
        const startTime = new Date((presence as any).started_at);
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