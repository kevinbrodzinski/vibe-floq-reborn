import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MemberPresence {
  id: string;
  status: 'online' | 'away' | 'busy' | 'offline' | 'in_meeting' | 'focused' | 'mobile' | 'desktop';
  lastSeen: Date;
  isTyping: boolean;
  location: {
    name: string;
    type: 'venue' | 'home' | 'work' | 'transit' | 'outdoor' | 'unknown';
    coordinates: { lat: number; lng: number };
    accuracy: number;
    lastUpdate: Date;
  };
  device: 'mobile' | 'desktop' | 'tablet';
  battery: number;
  signal: 'excellent' | 'good' | 'fair' | 'poor';
  activity: {
    type: 'typing' | 'viewing' | 'interacting' | 'idle';
    intensity: number;
    lastAction: string;
    timestamp: Date;
  };
  vibe: {
    current: string;
    intensity: number;
    mood: 'positive' | 'neutral' | 'negative';
    lastChange: Date;
  };
  interactions: {
    messagesSent: number;
    reactionsGiven: number;
    plansJoined: number;
    lastInteraction: Date;
  };
  metadata: {
    timezone: string;
    language: string;
    appVersion: string;
    platform: string;
  };
}

export interface PresenceUpdate {
  memberId: string;
  type: 'status' | 'location' | 'activity' | 'vibe' | 'typing' | 'device';
  data: any;
  timestamp: Date;
}

export function useFloqPresence(floqId: string) {
  const { user } = useAuth();
  const [presence, setPresence] = useState<Record<string, MemberPresence>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set());

  // Initialize presence for current user
  const initializePresence = useCallback(async () => {
    if (!user) return;

    const userPresence: MemberPresence = {
      id: user.id,
      status: 'online',
      lastSeen: new Date(),
      isTyping: false,
      location: {
        name: 'Unknown',
        type: 'unknown',
        coordinates: { lat: 0, lng: 0 },
        accuracy: 0,
        lastUpdate: new Date()
      },
      device: 'desktop',
      battery: 100,
      signal: 'excellent',
      activity: {
        type: 'viewing',
        intensity: 50,
        lastAction: 'Joined floq',
        timestamp: new Date()
      },
      vibe: {
        current: 'Chill',
        intensity: 50,
        mood: 'neutral',
        lastChange: new Date()
      },
      interactions: {
        messagesSent: 0,
        reactionsGiven: 0,
        plansJoined: 0,
        lastInteraction: new Date()
      },
      metadata: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        appVersion: '1.0.0',
        platform: navigator.platform
      }
    };

    setPresence(prev => ({
      ...prev,
      [user.id]: userPresence
    }));

    // Broadcast presence to other members
    await broadcastPresence(userPresence);
  }, [user]);

  // Broadcast presence update
  const broadcastPresence = useCallback(async (presenceData: MemberPresence) => {
    if (!user) return;

    try {
      await supabase.channel(`floq-presence-${floqId}`).send({
        type: 'broadcast',
        event: 'presence_update',
        payload: {
          memberId: user.id,
          presence: presenceData,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to broadcast presence:', error);
    }
  }, [user, floqId]);

  // Update user's presence
  const updatePresence = useCallback(async (updates: Partial<MemberPresence>) => {
    if (!user) return;

    setPresence(prev => {
      const currentPresence = prev[user.id];
      if (!currentPresence) return prev;

      const updatedPresence: MemberPresence = {
        ...currentPresence,
        ...updates,
        lastSeen: new Date()
      };

      // Broadcast the update
      broadcastPresence(updatedPresence);

      return {
        ...prev,
        [user.id]: updatedPresence
      };
    });
  }, [user, broadcastPresence]);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    if (!user) return;

    try {
      await supabase.channel(`floq-presence-${floqId}`).send({
        type: 'broadcast',
        event: 'typing_indicator',
        payload: {
          memberId: user.id,
          isTyping,
          timestamp: new Date().toISOString()
        }
      });

      // Update local state
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(user.id);
        } else {
          newSet.delete(user.id);
        }
        return newSet;
      });
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }, [user, floqId]);

  // Update location
  const updateLocation = useCallback(async (location: MemberPresence['location']) => {
    await updatePresence({ location });
  }, [updatePresence]);

  // Update activity
  const updateActivity = useCallback(async (activity: MemberPresence['activity']) => {
    await updatePresence({ activity });
  }, [updatePresence]);

  // Update vibe
  const updateVibe = useCallback(async (vibe: MemberPresence['vibe']) => {
    await updatePresence({ vibe });
  }, [updatePresence]);

  // Update status
  const updateStatus = useCallback(async (status: MemberPresence['status']) => {
    await updatePresence({ status });
  }, [updatePresence]);

  // Get member presence
  const getMemberPresence = useCallback((memberId: string): MemberPresence | null => {
    return presence[memberId] || null;
  }, [presence]);

  // Get online members
  const getOnlineMembers = useCallback((): MemberPresence[] => {
    return Object.values(presence).filter(member => 
      member.status === 'online' || member.status === 'away' || member.status === 'busy'
    );
  }, [presence]);

  // Get active members (recent activity)
  const getActiveMembers = useCallback((): MemberPresence[] => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return Object.values(presence).filter(member => 
      member.lastSeen > fiveMinutesAgo
    );
  }, [presence]);

  // Get members by location
  const getMembersByLocation = useCallback((locationType: MemberPresence['location']['type']): MemberPresence[] => {
    return Object.values(presence).filter(member => 
      member.location.type === locationType
    );
  }, [presence]);

  // Get members by vibe
  const getMembersByVibe = useCallback((vibe: string): MemberPresence[] => {
    return Object.values(presence).filter(member => 
      member.vibe.current === vibe
    );
  }, [presence]);

  // Calculate engagement score for a member
  const getEngagementScore = useCallback((memberId: string): number => {
    const member = presence[memberId];
    if (!member) return 0;

    const now = new Date();
    const lastSeenMinutes = (now.getTime() - member.lastSeen.getTime()) / (1000 * 60);
    const lastInteractionMinutes = (now.getTime() - member.interactions.lastInteraction.getTime()) / (1000 * 60);

    let score = 100;

    // Reduce score based on inactivity
    if (lastSeenMinutes > 60) score -= 30;
    if (lastSeenMinutes > 30) score -= 20;
    if (lastSeenMinutes > 15) score -= 10;

    // Reduce score based on lack of interactions
    if (lastInteractionMinutes > 120) score -= 20;
    if (lastInteractionMinutes > 60) score -= 10;

    // Boost score for recent activity
    if (member.activity.type === 'typing') score += 10;
    if (member.activity.type === 'interacting') score += 5;
    if (member.activity.intensity > 80) score += 10;

    // Boost score for positive vibe
    if (member.vibe.mood === 'positive') score += 5;

    return Math.max(0, Math.min(100, score));
  }, [presence]);

  // Subscribe to presence updates
  useEffect(() => {
    if (!user || !floqId) return;

    const channel = supabase.channel(`floq-presence-${floqId}`);

    // Subscribe to presence updates
    channel
      .on('broadcast', { event: 'presence_update' }, (payload) => {
        const { memberId, presence: memberPresence } = payload.payload;
        
        setPresence(prev => ({
          ...prev,
          [memberId]: {
            ...memberPresence,
            lastSeen: new Date(memberPresence.lastSeen),
            location: {
              ...memberPresence.location,
              lastUpdate: new Date(memberPresence.location.lastUpdate)
            },
            activity: {
              ...memberPresence.activity,
              timestamp: new Date(memberPresence.activity.timestamp)
            },
            vibe: {
              ...memberPresence.vibe,
              lastChange: new Date(memberPresence.vibe.lastChange)
            },
            interactions: {
              ...memberPresence.interactions,
              lastInteraction: new Date(memberPresence.interactions.lastInteraction)
            }
          }
        }));

        setLastUpdate(new Date());
      })
      .on('broadcast', { event: 'typing_indicator' }, (payload) => {
        const { memberId, isTyping } = payload.payload;
        
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (isTyping) {
            newSet.add(memberId);
          } else {
            newSet.delete(memberId);
          }
          return newSet;
        });
      })
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setActiveUsers(prev => {
          const newSet = new Set(prev);
          newPresences.forEach((presence: any) => {
            newSet.add(presence.profile_id);
          });
          return newSet;
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setActiveUsers(prev => {
          const newSet = new Set(prev);
          leftPresences.forEach((presence: any) => {
            newSet.delete(presence.profile_id);
          });
          return newSet;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await initializePresence();
        }
      });

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
      setIsConnected(false);
    };
  }, [user, floqId, initializePresence]);

  // Periodic presence updates
  useEffect(() => {
    if (!isConnected || !user) return;

    const interval = setInterval(() => {
      updatePresence({ lastSeen: new Date() });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, user, updatePresence]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!user) return;

      if (document.hidden) {
        updateStatus('away');
      } else {
        updateStatus('online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, updateStatus]);

  return {
    // State
    presence,
    isConnected,
    lastUpdate,
    typingUsers,
    activeUsers,

    // Actions
    updatePresence,
    updateLocation,
    updateActivity,
    updateVibe,
    updateStatus,
    sendTypingIndicator,

    // Queries
    getMemberPresence,
    getOnlineMembers,
    getActiveMembers,
    getMembersByLocation,
    getMembersByVibe,
    getEngagementScore,

    // Utilities
    isTyping: (memberId: string) => typingUsers.has(memberId),
    isActive: (memberId: string) => activeUsers.has(memberId),
    getPresenceCount: () => Object.keys(presence).length,
    getOnlineCount: () => getOnlineMembers().length,
    getActiveCount: () => getActiveMembers().length
  };
} 