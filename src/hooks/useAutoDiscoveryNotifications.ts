import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';

interface AutoDiscoveryOptions {
  enabled?: boolean;
  checkIntervalMs?: number;
  proximityRadiusM?: number;
  waveMinSize?: number;
}

interface DiscoveryEvent {
  type: 'wave_activity_friend' | 'friend_started_floq_nearby' | 'momentary_floq_nearby';
  friendId?: string;
  friendName?: string;
  floqId?: string;
  floqTitle?: string;
  venueId?: string;
  venueName?: string;
  lat: number;
  lng: number;
  distance: number;
  timestamp: string;
}

export function useAutoDiscoveryNotifications(
  userLat: number | null,
  userLng: number | null,
  options: AutoDiscoveryOptions = {}
) {
  const {
    enabled = true,
    checkIntervalMs = 30000, // Check every 30 seconds
    proximityRadiusM = 2000, // 2km radius
    waveMinSize = 3
  } = options;

  const { user } = useAuth();
  const { friendIds } = useUnifiedFriends();
  const [discoveries, setDiscoveries] = useState<DiscoveryEvent[]>([]);
  const lastCheckRef = useRef<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkForActivity = async () => {
    if (!userLat || !userLng || !user || friendIds.length === 0) return;

    try {
      // Check for wave activity with friends
      const { data: waves } = await supabase.rpc('rpc_waves_near', {
        center_lat: userLat,
        center_lng: userLng,
        radius_m: proximityRadiusM,
        friends_only: true,
        min_size: waveMinSize,
        recent_minutes: 5, // Only very recent activity
        only_close_friends: false
      });

      // Check for new momentary floqs by friends
      const { data: recentFloqs } = await supabase
        .from('floqs')
        .select(`
          id, title, name, creator_id, created_at, ends_at, flock_type,
          creator:profiles!creator_id(display_name, username)
        `)
        .eq('flock_type', 'momentary')
        .in('creator_id', friendIds)
        .gte('created_at', new Date(Date.now() - checkIntervalMs * 2).toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      const newDiscoveries: DiscoveryEvent[] = [];

      // Process wave activity
      if (waves && waves.length > 0) {
        waves.forEach(wave => {
          if (wave.friends_in_cluster > 0) {
            newDiscoveries.push({
              type: 'wave_activity_friend',
              lat: wave.centroid_lat,
              lng: wave.centroid_lng,
              distance: wave.distance_m,
              timestamp: wave.last_seen_at,
            });
          }
        });
      }

      // Process friend floqs
      if (recentFloqs && recentFloqs.length > 0) {
        recentFloqs.forEach((floq: any) => {
          newDiscoveries.push({
            type: 'friend_started_floq_nearby',
            friendId: floq.creator_id,
            friendName: floq.creator?.display_name || floq.creator?.username || 'A friend',
            floqId: floq.id,
            floqTitle: floq.title || floq.name || 'Untitled Floq',
            lat: 0, // TODO: Get floq location
            lng: 0,
            distance: 0, // TODO: Calculate distance
            timestamp: floq.created_at,
          });
        });
      }

      // Only add truly new discoveries (not seen in last check)
      const cutoff = lastCheckRef.current || new Date(Date.now() - checkIntervalMs);
      const freshDiscoveries = newDiscoveries.filter(d => 
        new Date(d.timestamp) > cutoff
      );

      if (freshDiscoveries.length > 0) {
        setDiscoveries(prev => [...freshDiscoveries, ...prev].slice(0, 10)); // Keep last 10
        
        // Send notifications for each discovery
        freshDiscoveries.forEach(discovery => {
          sendAutoDiscoveryNotification(discovery);
        });
      }

      lastCheckRef.current = new Date();
    } catch (error) {
      console.error('Auto-discovery check failed:', error);
    }
  };

  const sendAutoDiscoveryNotification = async (discovery: DiscoveryEvent) => {
    try {
      // Insert into event_notifications table
      await supabase
        .from('event_notifications')
        .insert({
          profile_id: user?.id,
          kind: discovery.type,
          payload: {
            friend_id: discovery.friendId,
            friend_name: discovery.friendName,
            floq_id: discovery.floqId,
            floq_title: discovery.floqTitle,
            venue_id: discovery.venueId,
            venue_name: discovery.venueName,
            lat: discovery.lat,
            lng: discovery.lng,
            distance_m: discovery.distance,
          }
        });
    } catch (error) {
      console.error('Failed to send auto-discovery notification:', error);
    }
  };

  useEffect(() => {
    if (!enabled || !userLat || !userLng) return;

    // Initial check
    checkForActivity();

    // Set up interval
    timerRef.current = setInterval(checkForActivity, checkIntervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [enabled, userLat, userLng, friendIds.length, checkIntervalMs, proximityRadiusM]);

  return {
    discoveries,
    clearDiscoveries: () => setDiscoveries([]),
    checkNow: checkForActivity,
  };
}