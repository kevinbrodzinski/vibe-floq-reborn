/**
 * Location sharing hook - handles GPS + real-time presence broadcasting with privacy
 * Built on top of useLocationTracking but adds live sharing with privacy controls
 */
import { useRef, useEffect, useCallback } from 'react';
import { useLocationTracking, type LocationTrackingOptions } from './useLocationTracking';
import { useLiveShareFriends } from '@/hooks/useLiveShareFriends';
import { useLiveSettings } from '@/hooks/useLiveSettings';
import { useContextDetection } from '@/hooks/useContextDetection';
import { applyPrivacyFilter } from '@/lib/location/privacy';
import { supabase } from '@/integrations/supabase/client';
import dayjs from '@/lib/dayjs';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface LocationSharingOptions extends LocationTrackingOptions {
  /** How often to broadcast presence (ms) */
  presenceBroadcastIntervalMs?: number;
}

const DEFAULT_SHARING_OPTIONS = {
  presenceBroadcastIntervalMs: 10000, // 10 seconds
};

/**
 * Full-featured location hook with GPS tracking + live sharing with privacy controls
 */
export function useLocationSharing(options: LocationSharingOptions = {}) {
  const sharingOpts = { ...DEFAULT_SHARING_OPTIONS, ...options };
  const tracking = useLocationTracking(options);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastPresenceBroadcast = useRef<number>(0);
  const userIdRef = useRef<string | null>(null);

  // Privacy and sharing controls
  const shareTo = useLiveShareFriends();
  const { data: liveSettings } = useLiveSettings();
  const { detectContext } = useContextDetection();

  const startSharing = useCallback(async () => {
    console.log('[LocationSharing] Starting location sharing...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[LocationSharing] Not authenticated');
        return;
      }
      userIdRef.current = user.id;

      // Start tracking first
      await tracking.startTracking();

      // Create presence channel for live sharing
      if (!channelRef.current) {
        console.log('[LocationSharing] Creating presence channel...');
        channelRef.current = supabase
          .channel(`presence_${user.id}`)
          .on('broadcast', { event: 'error' }, () => 
            console.error('[LocationSharing] Channel error'))
          .on('broadcast', { event: 'close' }, () => 
            console.warn('[LocationSharing] Channel closed'))
          .subscribe(status => {
            console.log('[LocationSharing] Channel status:', status);
          });
      }

    } catch (err) {
      console.error('[LocationSharing] Start sharing error:', err);
    }
  }, [tracking]);

  const stopSharing = useCallback(async () => {
    console.log('[LocationSharing] Stopping location sharing...');
    
    // Stop tracking
    tracking.stopTracking();

    // Clean up presence channel with proper unsubscribe
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    userIdRef.current = null;
    lastPresenceBroadcast.current = 0;
  }, [tracking]);

  // Handle live sharing when location updates
  useEffect(() => {
    if (!tracking.coords || !userIdRef.current || !channelRef.current) return;

    const now = Date.now();
    
    // Throttle presence broadcasts
    if (now - lastPresenceBroadcast.current < sharingOpts.presenceBroadcastIntervalMs) {
      return;
    }

    const broadcastPresence = async () => {
      try {
        // Null check for user and channel before proceeding
        if (!userIdRef.current || !channelRef.current || !tracking.coords) return;

        // Privacy checks - fail fast if no sharing allowed
        if (!shareTo.length) return;

        // Check ghost mode
        if (liveSettings?.live_muted_until && 
            dayjs(liveSettings.live_muted_until).isAfter(dayjs())) {
          return;
        }

        // Check live scope
        if (liveSettings?.live_scope === 'none') {
          return;
        }

        // Check auto-sharing rules with context detection
        const allowed = liveSettings?.live_auto_when ?? ['always'];
        const context = await detectContext(
          tracking.coords.lat, 
          tracking.coords.lng, 
          tracking.accuracy || 0, 
          allowed
        );

        const ruleOK = 
          allowed.includes('always') ||
          (context.inFloq && allowed.includes('in_floq')) ||
          (context.atVenue && allowed.includes('at_venue')) ||
          (context.walking && allowed.includes('walking'));

        if (!ruleOK) return;

        // Apply privacy filtering BEFORE transmission
        const privacyFiltered = applyPrivacyFilter(
          tracking.coords.lat,
          tracking.coords.lng,
          tracking.accuracy || 0,
          liveSettings
        );

        // Broadcast with privacy-filtered coordinates
        lastPresenceBroadcast.current = now;
        const payload = { 
          lat: privacyFiltered.lat, 
          lng: privacyFiltered.lng, 
          acc: privacyFiltered.accuracy, 
          ts: now 
        };
        
        console.log('[LocationSharing] Broadcasting location to friends:', {
          originalCoords: { lat: tracking.coords.lat, lng: tracking.coords.lng },
          filteredCoords: { lat: privacyFiltered.lat, lng: privacyFiltered.lng },
          privacyLevel: liveSettings?.live_accuracy,
          friendCount: shareTo.length
        });
        
        channelRef.current.send({
          type: 'broadcast',
          event: 'live_pos',
          payload
        });

      } catch (error) {
        console.error('[LocationSharing] Broadcast error:', error);
      }
    };

    broadcastPresence();
  }, [
    tracking.coords, 
    tracking.accuracy, 
    shareTo.length, 
    liveSettings, 
    detectContext, 
    sharingOpts.presenceBroadcastIntervalMs
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSharing();
    };
  }, [stopSharing]);

  return {
    // All tracking capabilities
    ...tracking,
    
    // Sharing-specific controls
    isSharing: !!channelRef.current && tracking.isTracking,
    startSharing,
    stopSharing,
    
    // Sharing status info
    shareToCount: shareTo.length,
    lastBroadcast: lastPresenceBroadcast.current,
  };
}