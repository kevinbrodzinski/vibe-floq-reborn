import { useEffect, useState } from 'react';
import { useUnifiedFriends } from './useUnifiedFriends';
import { supabase } from '@/integrations/supabase/client';
import { getEnvironmentConfig } from '@/lib/environment';
import { useAuth } from '@/providers/AuthProvider';

type StatusMap = Record<string, { status: 'online' | 'away'; visible?: boolean }>;

/**
 * Enhanced friends presence hook with real-time WebSocket support
 * Connects to vibes_now table for live friend tracking
 */
export function useFriendsPresence() {
  const env = getEnvironmentConfig();
  const { user } = useAuth();
  const [presenceMap, setPresenceMap] = useState<StatusMap>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    console.log('[FriendsPresence] Setting up WebSocket connection...');

    // Subscribe to presence updates for friends
    const channel = supabase
      .channel('friends_presence_live')
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'vibes_now'
      }, (payload) => {
        console.log('[FriendsPresence] Received update:', payload);

        const profileId = (payload.new as any)?.profile_id || (payload.old as any)?.profile_id;
        
        if (!profileId) return;

        setPresenceMap(prev => {
          if (payload.eventType === 'DELETE') {
            // User went offline
            const updated = { ...prev };
            delete updated[profileId];
            return updated;
          } else if (payload.new) {
            // User updated presence
            const newRecord = payload.new as any;
            const visibility = newRecord.visibility || 'public';
            
            return {
              ...prev,
              [profileId]: {
                status: 'online' as const,
                visible: visibility === 'public' || profileId === user.id
              }
            };
          }
          return prev;
        });
      })
      .subscribe((status) => {
        console.log('[FriendsPresence] Channel status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('[FriendsPresence] Cleaning up WebSocket...');
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [user]);

  // Add demo data for testing when no real presence data exists
  const enrichedPresenceMap = env.debugPresence ? {
    ...presenceMap,
    'demo-user-0': { status: 'online' as const, visible: true },
    'demo-user-1': { status: 'online' as const, visible: true },
    'demo-user-2': { status: 'away' as const, visible: true },
  } : presenceMap;

  if (env.debugPresence) {
    console.log('[FriendsPresence] Status:', { 
      isConnected, 
      totalPresence: Object.keys(enrichedPresenceMap).length 
    });
  }
  
  return {
    presenceMap: enrichedPresenceMap,
    isConnected,
    totalOnline: Object.values(enrichedPresenceMap).filter(p => p.status === 'online').length
  };
}