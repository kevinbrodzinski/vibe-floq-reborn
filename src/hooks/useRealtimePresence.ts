import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PresenceUpdate {
  profile_id: string;
  lat: number;
  lng: number;
  vibe: string;
  visibility: 'public' | 'friends';
  updated_at: string;
}

interface UseRealtimePresenceOptions {
  onPresenceUpdate?: (update: PresenceUpdate) => void;
  onPresenceRemove?: (profileId: string) => void;
  enabled?: boolean;
}

/**
 * WebSocket presence updates for real-time friend tracking
 * Connects to vibes_now table changes for live presence visualization
 */
export const useRealtimePresence = ({
  onPresenceUpdate,
  onPresenceRemove,
  enabled = true
}: UseRealtimePresenceOptions = {}) => {
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastUpdateRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!enabled || !user) return;

    console.log('[RealtimePresence] Setting up presence channel');

    // Create channel for presence updates
    const channel = supabase
      .channel('presence_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vibes_now'
      }, (payload) => {
        console.log('[RealtimePresence] Received presence update:', payload);

        const now = Date.now();
        const profileId = (payload.new as any)?.profile_id || (payload.old as any)?.profile_id;
        
        // Throttle updates per user (max 1 per second)
        if (profileId && lastUpdateRef.current[profileId] && 
            now - lastUpdateRef.current[profileId] < 1000) {
          return;
        }
        lastUpdateRef.current[profileId] = now;

        if (payload.eventType === 'DELETE') {
          // User went offline or stopped sharing presence
          if (onPresenceRemove && profileId) {
            onPresenceRemove(profileId);
          }
        } else if (payload.new) {
          // User updated their presence
          const newRecord = payload.new as any;
          const update: PresenceUpdate = {
            profile_id: newRecord.profile_id,
            lat: newRecord.lat,
            lng: newRecord.lng,
            vibe: newRecord.vibe || 'social',
            visibility: newRecord.visibility || 'public',
            updated_at: newRecord.updated_at || new Date().toISOString()
          };

          // Only process updates for visible users (public or friends)
          if (update.visibility === 'public' || update.profile_id === user.id) {
            onPresenceUpdate?.(update);
          }
        }
      })
      .subscribe((status) => {
        console.log('[RealtimePresence] Channel status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[RealtimePresence] Cleaning up presence channel');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, user, onPresenceUpdate, onPresenceRemove]);

  // Cleanup method
  const disconnect = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  return { disconnect };
};