import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { PulseEvent } from '@/types/pulse';

export const useLiveActivity = (limit = 40) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['live_activity', user?.id, limit],
    enabled: !!user?.id,
    queryFn: async () => {
      // Get recent pulse events from friends
      const { data } = await supabase
        .from('pulse_events')
        .select(`
          id,
          created_at,
          event_type,
          profile_id,
          floq_id,
          venue_id,
          vibe_tag,
          people_count,
          meta,
          profiles!pulse_events_profile_id_fkey(username, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (!data) return [];
      
      // Transform to PulseEvent format with actor info in meta
      return data.map(event => {
        const existingMeta = (event.meta as Record<string, unknown>) || {};
        return {
          ...event,
          meta: {
            ...existingMeta,
            actor_name: event.profiles?.display_name || event.profiles?.username,
            actor_avatar: event.profiles?.avatar_url
          }
        } as PulseEvent;
      });
    },
    staleTime: 30_000,
  });
};