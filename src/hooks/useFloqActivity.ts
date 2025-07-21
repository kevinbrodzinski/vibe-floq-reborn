import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FloqActivity {
  id: string;
  floq_id: string;
  plan_id?: string;
  user_id?: string;
  guest_name?: string;
  kind: 'created' | 'edited' | 'commented';
  content?: string;
  created_at: string;
}

// Extended interface for flock history events
export interface FlockHistoryEvent {
  id: string;
  event_type: string;
  created_at: string;
  user_id: string | null;
  metadata: any;
  user_profile?: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
}

export function useFloqActivity(floqId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['floq-activity', floqId],
    queryFn: async () => {
      // Fetch both floq_activity (plan events) and flock_history (all other events)
      const [activityResult, historyResult] = await Promise.all([
        supabase
          .from('floq_activity')
          .select('*')
          .eq('floq_id', floqId)
          .order('created_at', { ascending: false }),
        supabase
          .from('flock_history')
          .select(`
            id,
            event_type,
            created_at,
            user_id,
            metadata,
            profiles:user_id(display_name, username, avatar_url)
          `)
          .eq('floq_id', floqId)
          .order('created_at', { ascending: false })
      ]);

      if (activityResult.error) throw activityResult.error;
      if (historyResult.error) throw historyResult.error;

      // Combine and sort all events by timestamp
      const planEvents = (activityResult.data || []).map(event => ({
        ...event,
        source: 'plan_activity' as const
      }));

      const historyEvents = (historyResult.data || []).map(event => ({
        ...event,
        source: 'flock_history' as const,
        user_profile: event.profiles ? {
          display_name: (event.profiles as any).display_name || 'Unknown',
          username: (event.profiles as any).username || 'unknown',
          avatar_url: (event.profiles as any).avatar_url || null
        } : null,
      }));

      // Merge and sort by created_at
      const allEvents = [...planEvents, ...historyEvents].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return allEvents;
    },
    enabled: !!floqId,
    staleTime: 60_000
  });

  // Live subscription for real-time updates on both tables
  useEffect(() => {
    if (!floqId) return;
    
    const activityChannel = supabase
      .channel(`floq-activity-${floqId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'floq_activity', 
        filter: `floq_id=eq.${floqId}` 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['floq-activity', floqId] });
      })
      .subscribe();

    const historyChannel = supabase
      .channel(`flock-history-${floqId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'flock_history', 
        filter: `floq_id=eq.${floqId}` 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['floq-activity', floqId] });
      })
      .subscribe();
    
    return () => {
      void activityChannel.unsubscribe();
      void historyChannel.unsubscribe();
    };
  }, [floqId, queryClient]);

  return { 
    activity: data ?? [], 
    isLoading 
  };
}