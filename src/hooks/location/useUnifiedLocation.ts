/**
 * Unified Location Hook - Single interface for all location needs
 * Integrates with useGeo foundation, LocationBus, CircuitBreaker, and Zustand store
 * Provides backwards compatibility while leveraging new architecture
 */

import { useEffect, useRef, useCallback } from 'react';
import { useGlobalLocationManager } from '@/lib/location/GlobalLocationManager';
import { locationBus } from '@/lib/location/LocationBus';
import { useLocationStore, useLocationActions, useLocationCoords, useLocationStatus } from '@/lib/store/useLocationStore';
import { executeWithCircuitBreaker } from '@/lib/database/CircuitBreaker';
import { supabase } from '@/integrations/supabase/client';
import { callFn } from '@/lib/callFn';

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
  
  // Actions
  startTracking: () => void;
  stopTracking: () => void;
  getCurrentLocation: () => Promise<{ lat: number; lng: number; accuracy: number }>;
  resetErrors: () => void;
}

/**
 * Main unified location hook - integrates all location systems
 */
export function useUnifiedLocation(options: UnifiedLocationOptions): UnifiedLocationState {
  const {
    enableTracking = false,
    enablePresence = false,
    minDistance = 10,
    minTime = 5000,
    hookId,
    priority = 'medium',
    autoStart = false
  } = options;

  // Initialize global location manager with useGeo
  const { geoState, manager } = useGlobalLocationManager({
    watch: true,
    enableHighAccuracy: true,
    minDistanceM: minDistance,
    debounceMs: Math.min(minTime, 2000) // Cap debounce at 2s for responsiveness
  });

  // Zustand store integration
  const coords = useLocationCoords();
  const { status, error, hasPermission } = useLocationStatus();
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

  // Sync geoState with Zustand store
  useEffect(() => {
    if (geoState.coords && geoState.status === 'success') {
      updateLocation(
        {
          lat: geoState.coords.lat,
          lng: geoState.coords.lng,
          accuracy: geoState.accuracy || 0
        },
        geoState.ts || Date.now()
      );
      setStatus('success');
    } else if (geoState.status === 'error') {
      setStatus('error', geoState.error);
    } else if (geoState.status === 'loading') {
      setStatus('loading');
    }

    setPermission(geoState.hasPermission || false);
  }, [geoState.coords, geoState.status, geoState.error, geoState.hasPermission, geoState.ts, geoState.accuracy, updateLocation, setStatus, setPermission]);

  // Register with LocationBus for coordinated updates
  useEffect(() => {
    if (consumerRef.current) return; // Already subscribed

    const unsubscribe = locationBus.registerConsumer({
      id: hookId,
      type: enableTracking ? 'tracking' : enablePresence ? 'presence' : 'display',
      priority,
      callback: (locationCoords) => {
        // Update store with location from bus
        updateLocation(locationCoords, locationCoords.timestamp);
        
        // Handle tracking
        if (enableTracking) {
          handleLocationTracking(locationCoords);
        }
        
        // Handle presence
        if (enablePresence) {
          handlePresenceUpdate(locationCoords);
        }
      },
      errorCallback: (error) => {
        setStatus('error', error);
      },
      options: {
        minDistance,
        minTime,
        enableBatching: enableTracking,
        enablePresence,
        enableTracking
      }
    });

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

    // Flush buffer periodically or when it gets large
    const now = Date.now();
    const shouldFlush = 
      locationBufferRef.current.length >= 10 || // Buffer size limit
      (now - lastFlushRef.current) >= 30000; // 30 second time limit

    if (shouldFlush) {
      await flushLocationBuffer();
    }
  }, [enableTracking]);

  // Handle presence updates (real-time sharing)
  const handlePresenceUpdate = useCallback(async (locationCoords: { lat: number; lng: number; accuracy: number; timestamp: number }) => {
    if (!enablePresence) return;

    try {
      await executeWithCircuitBreaker(
        async () => {
          const { error } = await callFn('upsert-presence', {
            lat: locationCoords.lat,
            lng: locationCoords.lng,
            accuracy: locationCoords.accuracy
          });

          if (error) {
            throw new Error(`Presence update failed: ${error.message}`);
          }
        },
        priority,
        {
          component: hookId,
          operationType: 'presence-update'
        }
      );
    } catch (error) {
      console.error('[useUnifiedLocation] Presence update failed:', error);
    }
  }, [enablePresence, priority, hookId]);

  // Flush location buffer to server
  const flushLocationBuffer = useCallback(async () => {
    if (locationBufferRef.current.length === 0) return;

    const batch = [...locationBufferRef.current];
    locationBufferRef.current = [];
    lastFlushRef.current = Date.now();

    try {
      await executeWithCircuitBreaker(
        async () => {
          const { error } = await callFn('record-locations', { batch });
          
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
    } catch (error) {
      console.error('[useUnifiedLocation] Location batch failed:', error);
      
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

        // Create presence channel
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
      if (presenceChannelRef.current) {
        presenceChannelRef.current.unsubscribe();
        presenceChannelRef.current = null;
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Flush any remaining location data
      if (locationBufferRef.current.length > 0) {
        flushLocationBuffer();
      }
      
      // Cleanup presence channel
      if (presenceChannelRef.current) {
        presenceChannelRef.current.unsubscribe();
      }
    };
  }, [flushLocationBuffer]);

  return {
    coords,
    timestamp: useLocationStore((state) => state.timestamp),
    status,
    error,
    hasPermission,
    isTracking: useLocationStore((state) => state.isTracking),
    bufferSize: locationBufferRef.current.length,
    startTracking,
    stopTracking,
    getCurrentLocation,
    resetErrors
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