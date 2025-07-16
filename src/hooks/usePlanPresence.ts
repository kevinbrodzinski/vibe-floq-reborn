import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
}

export function usePlanPresence(planId: string, options: UsePlanPresenceOptions = {}) {
  const [participants, setParticipants] = useState<ParticipantPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!planId) return;

    const channel = supabase.channel(`plan-presence-${planId}`);

    // Track own presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const participantList: ParticipantPresence[] = [];
        
        Object.values(presenceState).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            participantList.push({
              userId: presence.user_id,
              username: presence.username,
              displayName: presence.display_name,
              avatarUrl: presence.avatar_url,
              isOnline: true,
              lastSeen: new Date(),
              currentActivity: presence.activity,
              checkInStatus: presence.check_in_status
            });
          });
        });
        
        setParticipants(participantList);
        options.onPresenceUpdate?.(participantList);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          // Track current user's presence
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await channel.track({
              user_id: user.id,
              username: 'Current User', // Would come from profile
              display_name: 'Current User',
              avatar_url: '',
              activity: 'timeline',
              check_in_status: 'offline'
            });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [planId, options]);

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