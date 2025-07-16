// Phase 10: Real-Time Stop Planning + Voting UI

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface UsePlanRealTimeSyncOptions {
  onParticipantJoin?: (participant: any) => void;
  onParticipantLeave?: (participant: any) => void;
  onVoteUpdate?: (voteData: any) => void;
  onStopUpdate?: (stopData: any) => void;
  onChatMessage?: (message: any) => void;
  onRSVPUpdate?: (rsvpData: any) => void;
  onPlanModeChange?: (mode: 'planning' | 'executing') => void;
  onParticipantTyping?: (typingData: { userId: string; isTyping: boolean }) => void;
  onVote?: (payload: any) => void;
}

// 2. Listen for Stop Changes in usePlanRealTimeSync
export function usePlanRealTimeSync(planId: string, options: UsePlanRealTimeSyncOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [planMode, setPlanMode] = useState<'planning' | 'executing'>('planning');
  const [activeParticipants, setActiveParticipants] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  
  const queryClient = useQueryClient();
  const channelsRef = useRef<any[]>([]);
  const { toast } = useToast();
  const lastToastRef = useRef<Record<string, number>>({});

  const flashVoteIndicator = (stopId: string) => {
    // Visual feedback for vote casting
    console.log(`Vote indicator flashed for stop: ${stopId}`)
  }

  // Enhanced cleanup and connection management
  const cleanupChannels = useCallback(() => {
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];
  }, []);

  // Optimized data fetching with caching
  const fetchParticipantCount = useCallback(async () => {
    try {
      const { count } = await supabase
        .from('plan_participants')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', planId);
      
      setParticipantCount(count || 0);
      
      // Invalidate related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['plan-participants', planId] });
    } catch (error) {
      console.error('Failed to fetch participant count:', error);
    }
  }, [planId, queryClient]);

  const fetchActiveParticipants = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('plan_participants')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('plan_id', planId);
      
      setActiveParticipants(data || []);
      
      // Cache for performance
      queryClient.setQueryData(['plan-participants', planId], data);
    } catch (error) {
      console.error('Failed to fetch active participants:', error);
    }
  }, [planId, queryClient]);

  useEffect(() => {
    if (!planId) return;

    setConnectionStatus('connecting');
    
    // Clean up existing channels
    cleanupChannels();

    const channel = supabase.channel(`plan-${planId}`)

    channel.on('broadcast', { event: 'stop_updated' }, ({ payload }) => {
      options.onStopUpdate?.(payload)
      
      // Throttle toasts to prevent spam
      const toastKey = `stop-${payload.data?.stop?.id || 'unknown'}`
      if (!lastToastRef.current[toastKey] || Date.now() - lastToastRef.current[toastKey] > 1500) {
        toast({ title: `${payload.data?.action === 'add' ? 'Stop added' : 'Stop updated'}` })
        lastToastRef.current[toastKey] = Date.now()
      }
    })

    channel.on('broadcast', { event: 'vote_cast' }, ({ payload }) => {
      options.onVote?.(payload)
      flashVoteIndicator(payload.stopId)
      
      // Throttle vote toasts
      const toastKey = `vote-${payload.stopId}`
      if (!lastToastRef.current[toastKey] || Date.now() - lastToastRef.current[toastKey] > 1500) {
        const username = payload.username || 'Someone'
        const voteIcon = payload.voteType === 'up' ? '👍' : '👎'
        toast({ title: `${username} voted ${voteIcon}` })
        lastToastRef.current[toastKey] = Date.now()
      }
    })

    // Subscribe to plan participants changes
    channel.on(
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
        } else if (payload.eventType === 'DELETE') {
          options.onParticipantLeave?.(payload.old);
        }
        // Update participant count and active participants
        fetchParticipantCount();
        fetchActiveParticipants();
      }
    )

    // Subscribe to plan votes changes
    channel.on(
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

    // Subscribe to plan stops changes
    channel.on(
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

    // Subscribe to plan comments/chat
    channel.on(
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

    // Subscribe to RSVP changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'plan_participants',
        filter: `plan_id=eq.${planId}`,
      },
      (payload) => {
        options.onRSVPUpdate?.(payload);
        fetchParticipantCount();
      }
    )

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
      setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'disconnected');
    });

    // Store channels for cleanup
    channelsRef.current = [channel];

    // Initial data fetch
    fetchParticipantCount();
    fetchActiveParticipants();

    return () => {
      cleanupChannels();
    };
  }, [planId, options, fetchParticipantCount, fetchActiveParticipants, cleanupChannels, toast]);

  // Function to update plan mode
  const updatePlanMode = async (newMode: 'planning' | 'executing') => {
    setPlanMode(newMode);
    options.onPlanModeChange?.(newMode);
    
    // Persist to Supabase for cross-device sync
    try {
      await supabase
        .from('floq_plans')
        .update({ collaboration_status: newMode })
        .eq('id', planId);
    } catch (error) {
      console.error('Failed to persist plan mode:', error);
    }
  };

  // Function to broadcast typing status
  const broadcastTyping = (isTyping: boolean) => {
    const channel = supabase.channel(`plan-presence-${planId}`);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: 'current-user', isTyping }
    });
  };

  return {
    isConnected,
    participantCount,
    planMode,
    activeParticipants,
    connectionStatus,
    updatePlanMode,
    broadcastTyping,
    fetchParticipantCount,
    fetchActiveParticipants,
  };
}