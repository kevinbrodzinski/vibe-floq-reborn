import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';

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
  const [participants, setParticipants] = useState<ParticipantPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const session = useSession();

  // ── NEW: hold the channel
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

      // Transform and remove duplicates
      const transformedParticipants = data?.map(participant => ({
        userId: participant.user_id,
        username: participant.profiles?.username || 'Unknown',
        displayName: participant.profiles?.display_name || 'Unknown',
        avatarUrl: participant.profiles?.avatar_url || '',
        isOnline: false,
        lastSeen: new Date(),
        currentActivity: 'timeline' as const,
        checkInStatus: 'offline' as const
      })) || [];

      const uniqueParticipants = transformedParticipants.reduce((acc, participant) => {
        if (!acc.find(p => p.userId === participant.userId)) {
          acc.push(participant);
        }
        return acc;
      }, [] as ParticipantPresence[]);

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
    if (!planId || options.silent) return;

    // Initial fetch
    debouncedFetchParticipants();

    // tear-down any previous channel
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    // ensure channel exists with presence config
    const channel = supabase
      .channel(`plan-presence-${planId}`, { 
        config: { presence: { key: session?.user?.id ?? '' } } 
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plan_participants', filter: `plan_id=eq.${planId}` },
        debouncedFetchParticipants
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, any[]>;
        const presenceList = Object.values(state).flat().map(raw => ({
          userId: raw.user_id,
          username: raw.username,
          displayName: raw.display_name,
          avatarUrl: raw.avatar_url,
          isOnline: true,
          lastSeen: new Date(),
          currentActivity: raw.activity,
          checkInStatus: raw.check_in_status,
        }));
        
        // Merge presence data with SQL participants
        const mergedParticipants = participants.map(p => {
          const presenceData = presenceList.find(pr => pr.userId === p.userId);
          return presenceData ? {
            ...p,
            isOnline: presenceData.isOnline,
            lastSeen: presenceData.lastSeen,
            currentActivity: presenceData.currentActivity,
            checkInStatus: presenceData.checkInStatus
          } : p;
        });
        
        setParticipants(mergedParticipants);
        options.onPresenceUpdate?.(mergedParticipants);
      })
      .subscribe(status => setIsConnected(status === 'SUBSCRIBED'));

    channelRef.current = channel;

    return () => supabase.removeChannel(channel);
  }, [planId, debouncedFetchParticipants, options.silent, session?.user?.id]);

  const updateActivity = async (activity?: ParticipantPresence['currentActivity']) => {
    if (options.silent || !session?.user) return;

    const ch = channelRef.current ?? supabase
      .channel(`plan-presence-${planId}`, { config: { presence: { key: session.user.id } } });

    // store for re-use
    if (!channelRef.current) channelRef.current = ch;

    await ch.track({
      user_id: session.user.id,
      username: session.user.user_metadata?.username || session.user.email,
      display_name: session.user.user_metadata?.display_name || session.user.email,
      avatar_url: session.user.user_metadata?.avatar_url || '',
      activity: activity ?? 'timeline',
      check_in_status: 'online',
    });
  };

  const updateCheckInStatus = async (status: ParticipantPresence['checkInStatus']) => {
    if (options.silent || !session?.user) return;

    const ch = channelRef.current ?? supabase
      .channel(`plan-presence-${planId}`, { config: { presence: { key: session.user.id } } });

    // store for re-use
    if (!channelRef.current) channelRef.current = ch;

    await ch.track({
      user_id: session.user.id,
      username: session.user.user_metadata?.username || session.user.email,
      display_name: session.user.user_metadata?.display_name || session.user.email,
      avatar_url: session.user.user_metadata?.avatar_url || '',
      activity: 'timeline',
      check_in_status: status
    });
  };

  return {
    participants,
    isConnected,
    updateActivity,
    updateCheckInStatus,
  };
}