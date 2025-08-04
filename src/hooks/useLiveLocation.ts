/**
 * useLiveLocation - Unified location hook using LocationBus
 * 
 * Replaces all location hooks with a single, coordinated system:
 * - Single GPS watch via LocationBus
 * - Batched presence updates
 * - Circuit breaker for write storms
 * - Smart throttling based on movement
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { locationBus } from '@/lib/location/LocationBus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useCurrentVibe } from '@/lib/store/useVibe';

interface LiveLocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  updating: boolean;
  error: string | null;
  hasPermission: boolean;
}

interface PresenceUpdate {
  lat: number;
  lng: number;
  vibe: string;
  timestamp: number;
}

export function useLiveLocation() {
  const { user } = useAuth();
  const vibe = useCurrentVibe();
  
  const [state, setState] = useState<LiveLocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    updating: false,
    error: null,
    hasPermission: false
  });

  const lastPresenceUpdate = useRef<number>(0);
  const lastPosition = useRef<{ lat: number; lng: number } | null>(null);
  const presenceBuffer = useRef<PresenceUpdate[]>([]);
  const flushTimeout = useRef<NodeJS.Timeout | null>(null);

  // Circuit breaker for database writes
  const PRESENCE_THROTTLE_MS = 30_000; // 30 seconds minimum between updates
  const MOVEMENT_THRESHOLD = 10; // meters
  const BATCH_FLUSH_DELAY = 5_000; // 5 seconds

  const calculateDistance = (pos1: { lat: number; lng: number }, pos2: { lat: number; lng: number }) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (pos1.lat * Math.PI) / 180;
    const φ2 = (pos2.lat * Math.PI) / 180;
    const Δφ = ((pos2.lat - pos1.lat) * Math.PI) / 180;
    const Δλ = ((pos2.lng - pos1.lng) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const flushPresenceBuffer = useCallback(async () => {
    if (presenceBuffer.current.length === 0 || !user) return;

    const batch = [...presenceBuffer.current];
    presenceBuffer.current = [];

    setState(prev => ({ ...prev, updating: true }));

    try {
      // Use the latest position from the batch
      const latest = batch[batch.length - 1];
      
      const { error } = await supabase.rpc('upsert_presence', {
        p_lat: latest.lat,
        p_lng: latest.lng,
        p_vibe: latest.vibe,
        p_visibility: 'public'
      });

      if (error) throw error;

      lastPresenceUpdate.current = Date.now();
      console.log('[useLiveLocation] Presence updated successfully');

    } catch (error) {
      console.warn('[useLiveLocation] Presence update failed:', error);
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Update failed' }));
    } finally {
      setState(prev => ({ ...prev, updating: false }));
    }
  }, [user]);

  const queuePresenceUpdate = useCallback((lat: number, lng: number) => {
    if (!user || !vibe) return;

    const now = Date.now();
    
    // Circuit breaker: check time throttle
    if (now - lastPresenceUpdate.current < PRESENCE_THROTTLE_MS) {
      return;
    }

    // Movement gate: check if user moved significantly
    if (lastPosition.current) {
      const distance = calculateDistance(lastPosition.current, { lat, lng });
      if (distance < MOVEMENT_THRESHOLD) {
        return;
      }
    }

    // Add to buffer
    presenceBuffer.current.push({
      lat,
      lng,
      vibe,
      timestamp: now
    });

    lastPosition.current = { lat, lng };

    // Schedule flush
    if (flushTimeout.current) {
      clearTimeout(flushTimeout.current);
    }
    flushTimeout.current = setTimeout(flushPresenceBuffer, BATCH_FLUSH_DELAY) as any;

  }, [user, vibe, flushPresenceBuffer]);

  // Subscribe to LocationBus
  useEffect(() => {
    const unsubscribe = locationBus.subscribe(
      (position) => {
        if (!position) return;

        const { latitude, longitude, accuracy } = position.coords;
        
        setState(prev => ({
          ...prev,
          lat: latitude,
          lng: longitude,
          accuracy: accuracy || null,
          error: null,
          hasPermission: true
        }));

        // Queue presence update
        queuePresenceUpdate(latitude, longitude);
      },
      (error) => {
        setState(prev => ({
          ...prev,
          error: error.message,
          hasPermission: false
        }));
      }
    );

    return () => {
      unsubscribe();
      if (flushTimeout.current) {
        clearTimeout(flushTimeout.current);
      }
    };
  }, [queuePresenceUpdate]);

  // Flush buffer on unmount
  useEffect(() => {
    return () => {
      if (presenceBuffer.current.length > 0) {
        flushPresenceBuffer();
      }
    };
  }, [flushPresenceBuffer]);

  return {
    ...state,
    // Legacy compatibility
    pos: state.lat && state.lng ? { 
      lat: state.lat, 
      lng: state.lng, 
      accuracy: state.accuracy || 0 
    } : null,
    coords: state.lat && state.lng ? { 
      lat: state.lat, 
      lng: state.lng 
    } : null,
    location: state.lat && state.lng ? {
      coords: {
        latitude: state.lat,
        longitude: state.lng,
        accuracy: state.accuracy || 0
      },
      geohash: ''
    } : null,
    isTracking: !!state.lat && !!state.lng,
    loading: state.updating
  };
}