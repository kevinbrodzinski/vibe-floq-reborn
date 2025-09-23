/**
 * Unified Location Hook - Single interface for all location needs
 * Integrates with useGeo foundation, LocationBus, CircuitBreaker, and Zustand store
 * Provides backwards compatibility while leveraging new architecture
 * V2 ENHANCEMENT: Includes H3 spatial indexing for fast neighbor queries
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { encodeGeohash } from '@/lib/geohash';
import { useGlobalLocationManager } from '@/lib/location/GlobalLocationManager';
import { locationBus } from '@/lib/location/LocationBus';
import { useLocationStore, useLocationActions, useRawLocationCoords, useLocationStatus } from '@/lib/store/useLocationStore';
import { executeWithCircuitBreaker } from '@/lib/database/CircuitBreaker';
import { supabase } from '@/integrations/supabase/client';
import { callFn } from '@/lib/callFn';
import { useGeo } from '@/hooks/useGeo'; // Import the fixed useGeo hook

/* ────────────────────────────────────────────────────────────── helper ──── */
const devLog = (...args: unknown[]) =>
  import.meta.env.DEV && console.info('[useUnifiedLocation]', ...args);

interface UnifiedLocationOptions {
  /** Enable server-side location recording */
  enableTracking?: boolean;
  /** Enable real-time presence sharing */
  enablePresence?: boolean;
  /** Minimum distance between updates (meters) */
  minDistance?: number;
  /** Minimum time between updates (ms) */
  minTime?: number;
  /** Unique identifier for this hook instance */
  hookId: string;
  /** Priority for database operations */
  priority?: 'high' | 'medium' | 'low';
  /** Auto-start location tracking on mount */
  autoStart?: boolean;
}

interface UnifiedLocationState {
  coords: { lat: number; lng: number; accuracy: number } | null;
  timestamp: number | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  hasPermission: boolean;
  isTracking: boolean;
  bufferSize: number;
  
  // V2 ENHANCEMENT: H3 spatial indexing
  h3Index: string | null;
  
  // Actions
  startTracking: () => void;
  stopTracking: () => void;
  getCurrentLocation: () => Promise<{ lat: number; lng: number; accuracy: number }>;
  resetErrors: () => void;
  
  // V2 ENHANCEMENT: Spatial query methods
  getNearbyUsers: (radiusMeters?: number) => Promise<any[]>;
  getH3Neighbors: (ringSize?: number) => bigint[];
}

/**
 * Main unified location hook - integrates all location systems
 */
export function useUnifiedLocation(options: UnifiedLocationOptions): UnifiedLocationState {
  const {
    enableTracking = false,
    enablePresence = false,
    minDistance = 50, // Increased for rate limiting
    minTime = 30000, // Increased for rate limiting  
    hookId,
    priority = 'medium',
    autoStart = false
  } = options;

  // Emergency disable flag
  const EMERGENCY_DISABLE = false;

  // 🔧 SURGICAL FIX: Use useGeo directly for coordinates
  const baseGeo = useGeo();
  
  // Initialize global location manager with useGeo - rate limited
  const { geoState, manager } = useGlobalLocationManager();

  // 🔧 NORMALIZE: Convert useGeo {lat, lng} coordinates to unified format
  const normalizedCoords = baseGeo.coords ? {
    lat: baseGeo.coords.lat,
    lng: baseGeo.coords.lng, 
    accuracy: baseGeo.accuracy || 50
  } : null;

  // Zustand store integration - use normalized coords from useGeo
  const coords = normalizedCoords;
  const locationStatus = baseGeo.status === 'ready' ? 'success' : 
                         baseGeo.status === 'error' ? 'error' :
                         baseGeo.status === 'fetching' ? 'loading' : 'idle';
  const status = locationStatus;
  const error = baseGeo.error || null;
  const hasPermission = baseGeo.hasPermission || false;
  const {
    updateLocation,
    updateMovementContext,
    setStatus,
    setPermission,
    startTracking: startStoreTracking,
    stopTracking: stopStoreTracking,
    enablePresence: enableStorePresence,
    disablePresence: disableStorePresence,
    updateSystemHealth
  } = useLocationActions();

  // Local state
  const consumerRef = useRef<(() => void) | null>(null);
  const presenceChannelRef = useRef<any>(null);
  const locationBufferRef = useRef<Array<{ ts: string; lat: number; lng: number; acc: number }>>([]);
  const lastFlushRef = useRef<number>(0);
  const isInitializedRef = useRef(false);

  // 🔧 SYNC: Update store when useGeo provides new coordinates (fixed infinite loop)
  useEffect(() => {
    if (!normalizedCoords) return;

    // ❶ Short-circuit if coords didn't actually move
    // FIX: Access the actual store, not the hook
    const currentState = useLocationStore.getState();
    
    const same = 
      currentState.coords?.lat === normalizedCoords.lat &&
      currentState.coords?.lng === normalizedCoords.lng &&
      currentState.coords?.accuracy === normalizedCoords.accuracy;
      
    if (same) return; // No change → no re-render

    // Only update when coordinates actually changed
    useLocationStore.setState((prev) => ({
      ...prev,
      coords: normalizedCoords,
      timestamp: Date.now(),
      status: 'success' as const,
      error: null
    }));

    setStatus('success');
  }, [
    normalizedCoords?.lat,      // ← primitive deps, stable across renders
    normalizedCoords?.lng,
    normalizedCoords?.accuracy
  ]);

  // Register with LocationBus for coordinated updates
  useEffect(() => {
    if (consumerRef.current) return; // Already subscribed

    // Defensive check to avoid duplicate consumers during hot-reload
    if (isInitializedRef.current) {
      devLog('🔄 Hot-reload detected - skipping duplicate consumer registration');
      return;
    }

    // Convert priority string to number for LocationBus
    const priorityNumber = priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;
    
    const unsubscribe = locationBus.registerConsumer(hookId, (locationCoords) => {
      // Update store with location from bus
      updateLocation(locationCoords, locationCoords.timestamp || Date.now());
      
      // Handle tracking
      if (enableTracking) {
        handleLocationTracking({ ...locationCoords, timestamp: locationCoords.timestamp || Date.now() });
      }
      
      // Handle presence
      if (enablePresence) {
        handlePresenceUpdate({ ...locationCoords, timestamp: locationCoords.timestamp || Date.now() });
      }
    }, priorityNumber);

    consumerRef.current = unsubscribe;
    isInitializedRef.current = true;

    return () => {
      if (consumerRef.current) {
        consumerRef.current();
        consumerRef.current = null;
      }
    };
  }, [hookId, enableTracking, enablePresence, priority, minDistance, minTime, updateLocation, setStatus]);

  // Handle location tracking (server recording)
  const handleLocationTracking = useCallback(async (locationCoords: { lat: number; lng: number; accuracy: number; timestamp: number }) => {
    if (!enableTracking) return;

    // Add to buffer
    locationBufferRef.current.push({
      ts: new Date(locationCoords.timestamp).toISOString(),
      lat: locationCoords.lat,
      lng: locationCoords.lng,
      acc: locationCoords.accuracy
    });

    // Enhanced flush logic with better rate limiting
    const now = Date.now();
    const shouldFlush = 
      locationBufferRef.current.length >= 15 || // Increased buffer size
      (now - lastFlushRef.current) >= 120000; // 2 minute time limit (increased)

    if (shouldFlush) {
      await flushLocationBuffer();
    }
  }, [enableTracking]);

  // V2 ENHANCEMENT: Handle presence updates with H3 spatial indexing
  const handlePresenceUpdate = useCallback(async (locationCoords: { lat: number; lng: number; accuracy: number; timestamp: number }) => {
    if (!enablePresence) return;

    try {
      await executeWithCircuitBreaker(
        async () => {
          // V2: Compute geohash for spatial indexing (TLA-free alternative to H3)
          const spatialHash = encodeGeohash(locationCoords.lat, locationCoords.lng, 8);

          // Use V2 presence function with spatial indexing
          const { data, error } = await supabase.rpc('upsert_presence_realtime_v2', {
            p_lat: locationCoords.lat,
            p_lng: locationCoords.lng,
            p_vibe: 'active', // Default vibe for presence
            p_accuracy: locationCoords.accuracy,
            p_h3_idx: spatialHash.slice(0, 8).split('').reduce((acc, char) => acc * 32 + '0123456789bcdefghjkmnpqrstuvwxyz'.indexOf(char), 0) // Convert geohash to numeric index
          });

          if (error) {
            throw new Error(`V2 presence update failed: ${error.message}`);
          }

          // Log V2 spatial indexing success
          if (import.meta.env.MODE === 'development' && data && typeof data === 'object' && 'spatial_strategy' in data) {
           console.debug('[useUnifiedLocation] V2 presence updated:', {
             spatial_strategy: (data as any).spatial_strategy,
             h3_idx: spatialHash.slice(0, 8).split('').reduce((acc, char) => acc * 32 + '0123456789bcdefghjkmnpqrstuvwxyz'.indexOf(char), 0),
             duration_ms: (data as any).duration_ms
           });
          }
        },
        priority,
        {
          component: hookId,
          operationType: 'presence-update-v2'
        }
      );
    } catch (error) {
      console.error('[useUnifiedLocation] V2 presence update failed:', error);
    }
  }, [enablePresence, priority, hookId]);

  // Flush location buffer to server with enhanced rate limiting
  const flushLocationBuffer = useCallback(async () => {
    if (EMERGENCY_DISABLE) {
      console.log('[useUnifiedLocation] Emergency disable - skipping flush');
      return;
    }

    if (locationBufferRef.current.length === 0) return;

    // Rate limit: minimum 60 seconds between flushes
    const now = Date.now();
    if (now - lastFlushRef.current < 60000) {
      console.log('[useUnifiedLocation] Skipping flush - rate limited');
      return;
    }

    // Only flush if we have enough data to justify the API call
    if (locationBufferRef.current.length < 3) {
      console.log('[useUnifiedLocation] Skipping small batch:', locationBufferRef.current.length);
      return;
    }

    const batch = [...locationBufferRef.current];
    locationBufferRef.current = [];
    lastFlushRef.current = now;

    try {
      await executeWithCircuitBreaker(
        async () => {
          const { error } = await callFn('record-locations', { batch }) as any;
          
          if (error) {
            throw new Error(`Location recording failed: ${error.message}`);
          }
        },
        priority,
        {
          component: hookId,
          operationType: 'location-batch',
          batchSize: batch.length
        }
      );
      
      console.log('[useUnifiedLocation] Successfully recorded', batch.length, 'locations');
    } catch (error: any) {
      console.error('[useUnifiedLocation] Location batch failed:', error);
      
      // Enhanced 429 error handling
      if (error.message?.includes('429') || error.status === 429) {
        console.warn('[useUnifiedLocation] Rate limited - backing off for 5 minutes');
        lastFlushRef.current = now + 300000; // 5 minute backoff
        return; // Don't re-add to buffer if rate limited
      }
      
      // Re-add failed batch to buffer (with limit to prevent infinite growth)
      if (locationBufferRef.current.length < 50) {
        locationBufferRef.current.unshift(...batch.slice(-25));
      }
    }
  }, [priority, hookId]);

  // Setup presence channel for real-time updates
  useEffect(() => {
    if (!enablePresence || presenceChannelRef.current) return;

    const setupPresenceChannel = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Create presence channel (user.id is the profile_id in database)
        const channel = supabase.channel(`presence:${user.id}`, {
          config: { presence: { key: user.id } }
        });

        channel
          .on('presence', { event: 'sync' }, () => {
            // Handle presence sync
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            // Handle new presence
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            // Handle presence leave
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              // Track presence
              if (coords) {
                await channel.track({
                  lat: coords.lat,
                  lng: coords.lng,
                  accuracy: coords.accuracy,
                  timestamp: Date.now()
                });
              }
            }
          });

        presenceChannelRef.current = channel;
      } catch (error) {
        console.error('[useUnifiedLocation] Presence channel setup failed:', error);
      }
    };

    setupPresenceChannel();

    return () => {
      // FIX: Await unsubscribe promise to prevent channel leaks
      if (presenceChannelRef.current) {
        presenceChannelRef.current.unsubscribe()
          .then(() => {
            presenceChannelRef.current = null;
          })
          .catch(console.error);
      }
    };
  }, [enablePresence, coords]);

  // Update system health metrics
  useEffect(() => {
    const updateHealth = () => {
      const managerDebug = manager.getDebugInfo();
      const busDebug = locationBus.getDebugInfo();
      
      updateSystemHealth({
        gpsManager: {
          isHealthy: managerDebug.hasPermission && managerDebug.isWatching,
          subscriberCount: managerDebug.subscriberCount,
          failureCount: managerDebug.failureCount,
          lastUpdate: managerDebug.lastUpdateTime
        },
        locationBus: {
          isHealthy: busDebug.isHealthy,
          consumerCount: busDebug.consumers.length,
          batchSize: busDebug.batchQueue.length,
          averageLatency: busDebug.metrics.averageLatency
        }
      });
    };

    // Update health immediately and then every 10 seconds
    updateHealth();
    const healthInterval = setInterval(updateHealth, 10000);

    return () => clearInterval(healthInterval);
  }, [manager, updateSystemHealth]);

  // Auto-start tracking if requested
  useEffect(() => {
    if (autoStart && isInitializedRef.current && !coords) {
      startTracking();
    }
  }, [autoStart]);

  // Actions
  const startTracking = useCallback(() => {
    if (enableTracking) {
      startStoreTracking();
    }
    if (enablePresence) {
      enableStorePresence();
    }
    
    // Request location permission if needed
    if (!hasPermission) {
      manager.requestLocationPermission();
    }
  }, [enableTracking, enablePresence, hasPermission, startStoreTracking, enableStorePresence, manager]);

  const stopTracking = useCallback(() => {
    if (enableTracking) {
      // Flush remaining buffer before stopping
      flushLocationBuffer();
      stopStoreTracking();
    }
    if (enablePresence) {
      disableStorePresence();
    }
  }, [enableTracking, enablePresence, flushLocationBuffer, stopStoreTracking, disableStorePresence]);

  const getCurrentLocation = useCallback(async (): Promise<{ lat: number; lng: number; accuracy: number }> => {
    // Try to get from store first
    if (coords) {
      return coords;
    }

    // Try to get from manager
    const managerLocation = manager.getCurrentLocation();
    if (managerLocation) {
      return {
        lat: managerLocation.lat,
        lng: managerLocation.lng,
        accuracy: managerLocation.accuracy
      };
    }

    // Request fresh location
    return new Promise((resolve, reject) => {
      if (!hasPermission) {
        reject(new Error('Location permission not granted'));
        return;
      }

      // Wait for next location update
      const unsubscribe = useLocationStore.subscribe(
        (state) => state.coords,
        (newCoords) => {
          if (newCoords) {
            unsubscribe();
            resolve(newCoords);
          }
        }
      );

      // Timeout after 10 seconds
      setTimeout(() => {
        unsubscribe();
        reject(new Error('Location request timeout'));
      }, 10000);
    });
  }, [coords, manager, hasPermission]);

  const resetErrors = useCallback(() => {
    setStatus('idle');
  }, [setStatus]);

  // V2 ENHANCEMENT: Get nearby users using H3 kRing
  const getNearbyUsers = useCallback(async (radiusMeters: number = 1000) => {
    if (!coords) return [];

    try {
      // Get H3 neighbors using LocationBus
      const h3Ring = locationBus.getH3Neighbors(coords.lat, coords.lng, 
        locationBus.getOptimalH3RingSize(radiusMeters));

      // Call V2 nearby users function with H3 optimization
      const { data, error } = await supabase.rpc('get_nearby_users_v2', {
        p_lat: coords.lat,
        p_lng: coords.lng,
        p_radius_meters: radiusMeters,
        p_h3_ring_ids: h3Ring.map(id => Number(id))
      });

      if (error) {
        console.warn('[useUnifiedLocation] Nearby users query failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.warn('[useUnifiedLocation] getNearbyUsers failed:', error);
      return [];
    }
  }, [coords]);

  // V2 ENHANCEMENT: Get geohash neighbors for current location  
  const getH3Neighbors = useCallback((ringSize: number = 1): bigint[] => {
    if (!coords) return [];
    // Simple geohash neighbor approximation - convert to bigint for compatibility
    const baseHash = encodeGeohash(coords.lat, coords.lng, 6);
    const hashAsNum = baseHash.slice(0, 8).split('').reduce((acc, char) => acc * 32 + '0123456789bcdefghjkmnpqrstuvwxyz'.indexOf(char), 0);
    return [BigInt(hashAsNum)]; // Return as bigint array for compatibility
  }, [coords]);

  // V2 ENHANCEMENT: Compute geohash for current location (TLA-free alternative)
  const h3Index = useMemo(
    () => coords ? encodeGeohash(coords.lat, coords.lng, 8) : null,
    [coords?.lat, coords?.lng]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Flush any remaining location data
      if (locationBufferRef.current.length > 0) {
        flushLocationBuffer();
      }
      
      // Cleanup presence channel with promise handling
      if (presenceChannelRef.current) {
        presenceChannelRef.current.unsubscribe()
          .then(() => {
            presenceChannelRef.current = null;
          })
          .catch(console.error);
      }
    };
  }, [flushLocationBuffer]);

  // Use Zustand selectors properly (cached by Zustand internally)
  const timestamp = useLocationStore((state) => state.timestamp);
  const isTracking = useLocationStore((state) => state.isTracking);

  return {
    coords,
    timestamp,
    status, // Already forwarded from baseGeo.status
    error,  // Already forwarded from baseGeo.error
    hasPermission,
    isTracking,
    bufferSize: locationBufferRef.current.length,
    h3Index, // V2: Current location H3 index
    startTracking,
    stopTracking,
    getCurrentLocation,
    resetErrors,
    getNearbyUsers: getNearbyUsers as any, // V2: H3-optimized nearby users query
    getH3Neighbors  // V2: Get H3 neighbors for current location
  };
}

/**
 * Specialized hooks built on useUnifiedLocation
 */

/**
 * GPS coordinates only - no tracking or presence
 */
export function useLocationCore(options: Omit<UnifiedLocationOptions, 'enableTracking' | 'enablePresence'>) {
  return useUnifiedLocation({
    ...options,
    enableTracking: false,
    enablePresence: false
  });
}

/**
 * GPS + server-side tracking - no presence sharing
 */
export function useLocationTracking(options: Omit<UnifiedLocationOptions, 'enablePresence'>) {
  return useUnifiedLocation({
    ...options,
    enableTracking: true,
    enablePresence: false
  });
}

/**
 * GPS + tracking + real-time presence sharing
 */
export function useLocationSharing(options: UnifiedLocationOptions) {
  return useUnifiedLocation({
    ...options,
    enableTracking: true,
    enablePresence: true
  });
}