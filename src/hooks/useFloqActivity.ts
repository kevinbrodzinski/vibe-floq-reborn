import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FloqActivity {
  id: string;
  floq_id: string;
  plan_id?: string;
  profile_id?: string;
  guest_name?: string;
  kind: 'created' | 'edited' | 'commented';
  content?: string;
  created_at: string;
}

export interface FlockHistoryEvent {
  id: string;
  event_type: string;
  created_at: string;
  profile_id: string | null;
  metadata: any;
  profiles?: any;
}

export interface UserProfile {
  display_name: string;
  username: string;
  avatar_url: string | null;
}

export type MergedActivity = 
  | (FloqActivity & { source: 'plan_activity' })
  | (FlockHistoryEvent & { source: 'flock_history'; user_profile: UserProfile | null })

// Type guards
export function isPlanActivity(entry: MergedActivity): entry is FloqActivity & { source: 'plan_activity' } {
  return entry.source === 'plan_activity';
}

export function useFloqActivity(floqId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<MergedActivity[]>({
    queryKey: ['floq-activity', floqId],
    queryFn: async (): Promise<MergedActivity[]> => {
      // Fetch both floq_activity (plan events) and flock_history (all other events)
      const [activityResult, historyResult] = await Promise.all([
        supabase
          .from('floq_activity')
          .select('*')
          .eq('floq_id', floqId as any)
          .order('created_at', { ascending: false }),
        supabase
          .from('flock_history')
          .select(`
            id,
            event_type,
            created_at,
            profile_id,
            metadata,
            profiles:profile_id(display_name, username, avatar_url)
          `)
          .eq('floq_id', floqId as any)
          .order('created_at', { ascending: false })
      ]);

      if (activityResult.error) throw activityResult.error;
      if (historyResult.error) throw historyResult.error;

      // Combine and sort all events by timestamp (optimized)
      const planEvents: MergedActivity[] = (activityResult.data || []).map((event: any) => ({
        ...event,
        source: 'plan_activity' as const
      } as MergedActivity));

      const historyEvents: MergedActivity[] = (historyResult.data || []).map((event: any) => {
        const profile = event.profiles as { display_name?: string; username?: string; avatar_url?: string } | null;
        return {
          ...event,
          source: 'flock_history' as const,
          user_profile: profile ? {
            display_name: profile.display_name || 'Unknown',
            username: profile.username || 'unknown',
            avatar_url: profile.avatar_url || null
          } : null,
        } as MergedActivity;
      });

      // Merge and sort by created_at (optimized)
      const allEvents = [...planEvents, ...historyEvents].sort(
        (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
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
      void activityChannel.unsubscribe().catch(console.error);
      void historyChannel.unsubscribe().catch(console.error);
    };
  }, [floqId, queryClient]);

  return { 
    activity: data ?? [], 
    isLoading 
  };
}