import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

interface ParticipantPresence {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isOnline: boolean;
  lastSeen: Date;
  currentActivity?: 'timeline' | 'chat' | 'venues' | 'idle';
  checkInStatus?: 'checked-in' | 'nearby' | 'away' | 'offline';
}

interface UsePlanPresenceOptions {
  onPresenceUpdate?: (participants: ParticipantPresence[]) => void;
  silent?: boolean;
}

export function usePlanPresence(planId: string, options: UsePlanPresenceOptions = {}) {
  const [participants, setParticipants] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const fetchActiveParticipants = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('plan_participants')
        .select(`
          user_id,
          profiles:user_id!inner (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('plan_id', planId);

      if (error) throw error;

      // Remove duplicates in case of multiple entries per user
      const uniqueParticipants = data?.reduce((acc, participant) => {
        if (!acc.find(p => p.user_id === participant.user_id)) {
          acc.push(participant);
        }
        return acc;
      }, [] as typeof data) || [];

      setParticipants(uniqueParticipants);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  }, [planId]);

  // Debounced version to avoid bursts
  const debouncedFetchParticipants = useCallback(
    debounce(fetchActiveParticipants, 300),
    [fetchActiveParticipants]
  );

  useEffect(() => {
    if (!planId) return;

    // Initial fetch
    debouncedFetchParticipants();

    // Set up real-time subscription
    const channel = supabase
      .channel(`plan-participants-${planId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'plan_participants',
        filter: `plan_id=eq.${planId}`
      }, () => {
        const handleRealTimeUpdate = () => {
          debouncedFetchParticipants();
        };
        handleRealTimeUpdate();
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [planId, debouncedFetchParticipants]);

  const updateActivity = async (activity: ParticipantPresence['currentActivity']) => {
    const channel = supabase.channel(`plan-presence-${planId}`);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await channel.track({
        user_id: user.id,
        username: 'Current User',
        display_name: 'Current User', 
        avatar_url: '',
        activity,
        check_in_status: 'offline'
      });
    }
  };

  const updateCheckInStatus = async (status: ParticipantPresence['checkInStatus']) => {
    const channel = supabase.channel(`plan-presence-${planId}`);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await channel.track({
        user_id: user.id,
        username: 'Current User',
        display_name: 'Current User',
        avatar_url: '',
        activity: 'timeline',
        check_in_status: status
      });
    }
  };

  return {
    participants,
    isConnected,
    updateActivity,
    updateCheckInStatus,
  };
}