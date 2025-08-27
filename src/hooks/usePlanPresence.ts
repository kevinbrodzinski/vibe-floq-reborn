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

export type DBParticipant = {
  profile_id: string;
  profiles: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type PresencePayload = {
  profile_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  activity: string;
  check_in_status: string;
};

export interface ParticipantPresence {
  profileId: string;
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
          profile_id,
          profiles:profiles!profile_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('plan_id', planId as any);

      if (error) throw error;

      // Transform and remove duplicates
      const transformedParticipants = (data as unknown as DBParticipant[] ?? []).map(participant => ({
        profileId: participant.profile_id,
        username: participant.profiles?.username ?? 'Unknown',
        displayName: participant.profiles?.display_name ?? participant.profiles?.username ?? 'Unknown',
        avatarUrl: participant.profiles?.avatar_url ?? '',
        isOnline: false,
        lastSeen: new Date(),
        currentActivity: 'timeline' as const,
        checkInStatus: 'offline' as const
      }));

      const uniqueParticipants = transformedParticipants.reduce((acc, participant) => {
        if (!acc.find(p => p.profileId === participant.profileId)) {
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

  const handlePresenceSync = useCallback(() => {
    const channel = channelRef.current;
    if (!channel) return;
    
    const state = channel.presenceState() as Record<string, PresencePayload[]>;
    const presenceList = Object.values(state).flat().map(raw => ({
      profileId: raw.profile_id,
      username: raw.username,
      displayName: raw.display_name,
      avatarUrl: raw.avatar_url,
      isOnline: true,
      lastSeen: new Date(),
      currentActivity: raw.activity as ParticipantPresence['currentActivity'],
      checkInStatus: raw.check_in_status as ParticipantPresence['checkInStatus'],
    }));
    
    // Merge presence data with SQL participants
    const mergedParticipants = participants.map(p => {
      const presenceData = presenceList.find(pr => pr.profileId === p.profileId);
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
  }, [participants, options]);

  /* ----- create + subscribe once ----- */
  useEffect(() => {
    if (!planId || options.silent) return;

    // Initial fetch
    debouncedFetchParticipants();

    // cleanup previous
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const ch = supabase.channel(
      `plan-presence-${planId}`,
      { config: { presence: { key: session?.user?.id ?? '' } } }
    )
      // Postgres changes for join/leave
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'plan_participants',
        filter: `plan_id=eq.${planId}` 
      }, debouncedFetchParticipants)
      // Presence sync for cursor / typing, etc.
      .on('presence', { event: 'sync' }, handlePresenceSync)
      .subscribe(status => setIsConnected(status === 'SUBSCRIBED'));

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [planId, options.silent, session?.user?.id, debouncedFetchParticipants, handlePresenceSync]);

  const broadcastPresence = useCallback(async (patch: Partial<PresencePayload>) => {
    if (options.silent || !session?.user) return;
    const ch = channelRef.current;
    if (!ch) return;
    
    await ch.track({
      profile_id: session.user.id,
      username: session.user.user_metadata?.username ?? session.user.email ?? 'Anonymous',
      display_name: session.user.user_metadata?.display_name ?? session.user.user_metadata?.username ?? session.user.email ?? 'Anonymous',
      avatar_url: session.user.user_metadata?.avatar_url ?? '',
      activity: patch.activity ?? 'timeline',
      check_in_status: patch.check_in_status ?? 'online',
      expires_at: Date.now() + 60_000 // 60-s TTL
    });
  }, [options.silent, session?.user]);

  const updateActivity = async (activity?: ParticipantPresence['currentActivity']) => {
    await broadcastPresence({ activity });
  };

  const updateCheckInStatus = async (status: ParticipantPresence['checkInStatus']) => {
    await broadcastPresence({ check_in_status: status });
  };

  return {
    participants,
    isConnected,
    updateActivity,
    updateCheckInStatus,
  };
}