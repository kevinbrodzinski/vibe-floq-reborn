import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePlanRealTimeSyncOptions {
  onParticipantJoin?: (participant: any) => void;
  onVoteUpdate?: (voteData: any) => void;
  onStopUpdate?: (stopData: any) => void;
  onChatMessage?: (message: any) => void;
}

export function usePlanRealTimeSync(planId: string, options: UsePlanRealTimeSyncOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    if (!planId) return;

    // Subscribe to plan participants changes
    const participantsChannel = supabase
      .channel(`plan-participants-${planId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_participants',
          filter: `plan_id=eq.${planId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            options.onParticipantJoin?.(payload.new);
          }
          // Update participant count
          fetchParticipantCount();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Subscribe to plan votes changes
    const votesChannel = supabase
      .channel(`plan-votes-${planId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_votes',
          filter: `plan_id=eq.${planId}`,
        },
        (payload) => {
          options.onVoteUpdate?.(payload);
        }
      )
      .subscribe();

    // Subscribe to plan stops changes
    const stopsChannel = supabase
      .channel(`plan-stops-${planId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_stops',
          filter: `plan_id=eq.${planId}`,
        },
        (payload) => {
          options.onStopUpdate?.(payload);
        }
      )
      .subscribe();

    // Subscribe to plan comments/chat
    const chatChannel = supabase
      .channel(`plan-chat-${planId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'plan_comments',
          filter: `plan_id=eq.${planId}`,
        },
        (payload) => {
          options.onChatMessage?.(payload.new);
        }
      )
      .subscribe();

    // Initial participant count fetch
    fetchParticipantCount();

    async function fetchParticipantCount() {
      const { count } = await supabase
        .from('plan_participants')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', planId);
      
      setParticipantCount(count || 0);
    }

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(votesChannel);
      supabase.removeChannel(stopsChannel);
      supabase.removeChannel(chatChannel);
    };
  }, [planId, options]);

  return {
    isConnected,
    participantCount,
  };
}