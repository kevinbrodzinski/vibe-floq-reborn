/**
 * Enhanced Location Sharing Hook
 * Integrates geofencing privacy zones, multi-signal venue detection, and proximity scoring
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';
import { useLiveSettings } from '@/hooks/useLiveSettings';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { geofencingService, type GeofenceMatch } from '@/lib/location/geofencing';
import { multiSignalVenueDetector, type VenueDetectionResult } from '@/lib/location/multiSignalVenue';
import { proximityScorer, type ProximityUser, type ProximityAnalysis, type ProximityEvent } from '@/lib/location/proximityScoring';
import { proximityEventRecorder } from '@/lib/location/proximityEventRecorder';
import { backgroundLocationProcessor } from '@/lib/location/backgroundLocationProcessor';
import { GPSCoords } from '@/lib/location/standardGeo';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface EnhancedLocationState {
  // Basic location data
  location: GPSCoords | null;
  accuracy: number;
  isTracking: boolean;
  
  // Privacy and geofencing
  geofenceMatches: GeofenceMatch[];
  privacyFiltered: boolean;
  privacyLevel: 'exact' | 'street' | 'area' | 'hidden';
  
  // Venue detection
  venueDetections: VenueDetectionResult[];
  currentVenue: VenueDetectionResult | null;
  
  // Proximity awareness
  nearbyUsers: ProximityAnalysis[];
  proximityEvents: ProximityEvent[]; // Recent proximity events
  
  // System status
  lastUpdate: number;
  error: string | null;
}

export interface EnhancedLocationSharingOptions {
  enableGeofencing?: boolean;
  enableVenueDetection?: boolean;
  enableProximityTracking?: boolean;
  enableBackgroundProcessing?: boolean;
  updateInterval?: number;
  debugMode?: boolean;
}

/**
 * Enhanced location sharing hook with privacy zones, venue detection, and proximity awareness
 */
export function useEnhancedLocationSharing(options: EnhancedLocationSharingOptions = {}) {
  const {
    enableGeofencing = true,
    enableVenueDetection = true,
    enableProximityTracking = true,
    enableBackgroundProcessing = true,
    updateInterval = 30000, // 30 seconds
    debugMode = false
  } = options;

  const { coords, status, error: locationError, isTracking } = useUnifiedLocation({
    enableTracking: true,
    enablePresence: true,
    hookId: 'enhanced-location-sharing'
  });
  const pos = coords; // Compatibility alias
  const loading = status === 'loading';
  const { data: liveSettings } = useLiveSettings();
  const { user } = useAuth();
  const { toast } = useToast();

  const [state, setState] = useState<EnhancedLocationState>({
    location: null,
    accuracy: 0,
    isTracking: false,
    geofenceMatches: [],
    privacyFiltered: false,
    privacyLevel: 'exact',
    venueDetections: [],
    currentVenue: null,
    nearbyUsers: [],
    proximityEvents: [],
    lastUpdate: 0,
    error: null
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const updateTimerRef = useRef<number | null>(null);
  const lastLocationRef = useRef<GPSCoords | null>(null);
  const nearbyUsersRef = useRef<Map<string, ProximityUser>>(new Map());

  /**
   * Process location update with all enhancements
   */
  const processLocationUpdate = useCallback(async (location: GPSCoords, accuracy: number) => {
    if (!user) return;

    const timestamp = Date.now();
    const newState: Partial<EnhancedLocationState> = {
      location,
      accuracy,
      lastUpdate: timestamp,
      error: null
    };

    try {
      // Option 1: Use background processor for better performance
      if (enableBackgroundProcessing) {
        backgroundLocationProcessor.queueLocationUpdate({
          location,
          accuracy,
          timestamp,
          userId: user.id
        });
        
        // Still do minimal processing for immediate UI updates
        const quickGeofenceCheck = enableGeofencing ? 
          geofencingService.checkGeofences(location, accuracy) : [];
        
        newState.geofenceMatches = quickGeofenceCheck;
        newState.privacyFiltered = quickGeofenceCheck.length > 0;
        newState.privacyLevel = quickGeofenceCheck.length > 0 ? 'street' : 'exact';
        
        // Update state and return early
        setState(prevState => ({ ...prevState, ...newState }));
        return;
      }
      
      // Option 2: Full processing in main thread (legacy mode)
      // 1. Geofencing Privacy Check
      let geofenceMatches: GeofenceMatch[] = [];
      let privacyFiltered = false;
      let privacyLevel: 'exact' | 'street' | 'area' | 'hidden' = 'exact';
      let filteredLocation = location;

      if (enableGeofencing) {
        geofenceMatches = geofencingService.checkGeofences(location, accuracy);
        
        if (geofenceMatches.length > 0) {
          const privacyResult = geofencingService.applyPrivacyFiltering(
            location, 
            accuracy, 
            geofenceMatches
          );
          
          if (privacyResult.hidden) {
            privacyLevel = 'hidden';
            privacyFiltered = true;
            // Don't share location at all
            if (debugMode) {
              console.log('[EnhancedLocation] Location hidden by geofence');
            }
            return;
          } else if (privacyResult.accuracy > accuracy) {
            privacyFiltered = true;
            privacyLevel = privacyResult.accuracy >= 1000 ? 'area' : 'street';
            filteredLocation = { lat: privacyResult.lat, lng: privacyResult.lng };
            
            if (debugMode) {
              console.log(`[EnhancedLocation] Location degraded to ${privacyLevel}`);
            }
          }
        }

        newState.geofenceMatches = geofenceMatches;
        newState.privacyFiltered = privacyFiltered;
        newState.privacyLevel = privacyLevel;
      }

      // 2. Multi-Signal Venue Detection
      let venueDetections: VenueDetectionResult[] = [];
      let currentVenue: VenueDetectionResult | null = null;

      if (enableVenueDetection) {
        try {
          // Get WiFi and Bluetooth data (platform-specific implementation needed)
          const wifiNetworks = await multiSignalVenueDetector.constructor.getWiFiNetworks();
          const bluetoothBeacons = await multiSignalVenueDetector.constructor.getBluetoothBeacons();

          venueDetections = await multiSignalVenueDetector.detectVenues(
            location,
            accuracy,
            wifiNetworks,
            bluetoothBeacons
          );

          // Find the highest confidence venue
          currentVenue = venueDetections.length > 0 ? venueDetections[0] : null;

          if (debugMode && currentVenue) {
            console.log(`[EnhancedLocation] Venue detected: ${currentVenue.venueId} (confidence: ${currentVenue.overallConfidence})`);
          }
        } catch (venueError) {
          console.error('[EnhancedLocation] Venue detection error:', venueError);
        }

        newState.venueDetections = venueDetections;
        newState.currentVenue = currentVenue;
      }

      // 3. Proximity Analysis
      let nearbyUsers: ProximityAnalysis[] = [];
      const proximityEvents: ProximityEvent[] = [];

      if (enableProximityTracking) {
        try {
          const currentUser: ProximityUser = {
            userId: user.id,
            location,
            accuracy,
            timestamp
          };

          // Analyze proximity with all known nearby users
          const proximityResults: ProximityAnalysis[] = [];
          
          for (const [userId, nearbyUser] of nearbyUsersRef.current) {
            if (userId !== user.id) {
              const analysis = proximityScorer.analyzeProximity(currentUser, nearbyUser);
              
              if (analysis.confidence > 0.1) {
                proximityResults.push(analysis);
                
                // Generate event descriptions for significant events
                if (analysis.eventType === 'enter') {
                  proximityEvents.push({
                    profileId: user?.id || '',
                    targetProfileId: userId,
                    eventType: 'enter',
                    distance: analysis.distance,
                    confidence: analysis.confidence,
                    timestamp: timestamp
                  });
                } else if (analysis.eventType === 'exit') {
                  proximityEvents.push({
                    profileId: user?.id || '',
                    targetProfileId: userId,
                    eventType: 'exit',
                    distance: analysis.distance,
                    confidence: analysis.confidence,
                    timestamp: timestamp,
                    duration: analysis.sustainedDuration
                  });
                } else if (analysis.eventType === 'sustain' && analysis.sustainedDuration > 60000) {
                  proximityEvents.push({
                    profileId: user?.id || '',
                    targetProfileId: userId,
                    eventType: 'sustain',
                    distance: analysis.distance,
                    confidence: analysis.confidence,
                    timestamp: timestamp,
                    duration: analysis.sustainedDuration
                  });
                }
              }
            }
          }

          nearbyUsers = proximityResults.sort((a, b) => b.confidence - a.confidence);

          if (debugMode && nearbyUsers.length > 0) {
            console.log(`[EnhancedLocation] ${nearbyUsers.length} nearby users detected`);
          }
        } catch (proximityError) {
          console.error('[EnhancedLocation] Proximity analysis error:', proximityError);
        }

        newState.nearbyUsers = nearbyUsers;
        newState.proximityEvents = proximityEvents;
        
        // Record proximity events to database
        if (proximityEvents.length > 0) {
          try {
            await proximityEventRecorder.recordProximityEvents(
              user.id,
              proximityEvents,
              nearbyUsers,
              { lat: location.lat, lng: location.lng, accuracy }
            );
          } catch (recordError) {
            console.error('[EnhancedLocation] Proximity event recording error:', recordError);
          }
        }
      }

      // 4. Broadcast Enhanced Location Data
      if (channelRef.current && !privacyFiltered) {
        const enhancedLocationData = {
          lat: filteredLocation.lat,
          lng: filteredLocation.lng,
          accuracy: privacyFiltered ? Math.max(accuracy, 100) : accuracy,
          timestamp,
          // Enhanced metadata
          venue: currentVenue ? {
            id: currentVenue.venueId,
            confidence: currentVenue.overallConfidence
          } : null,
          proximityCount: nearbyUsers.filter(u => u.isNear).length,
          privacyLevel,
          // User context
          vibe: liveSettings?.live_scope !== 'none' ? 'active' : 'private'
        };

        try {
          await channelRef.current.send({
            type: 'broadcast',
            event: 'enhanced_location_update',
            payload: enhancedLocationData
          });

          if (debugMode) {
            console.log('[EnhancedLocation] Broadcasted enhanced location data');
          }
        } catch (broadcastError) {
          console.error('[EnhancedLocation] Broadcast error:', broadcastError);
          newState.error = 'Failed to broadcast location';
        }
      }

      // Update state
      setState(prevState => ({ ...prevState, ...newState }));
      lastLocationRef.current = location;

    } catch (error) {
      console.error('[EnhancedLocation] Processing error:', error);
      setState(prevState => ({
        ...prevState,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdate: timestamp
      }));
    }
  }, [user, enableGeofencing, enableVenueDetection, enableProximityTracking, enableBackgroundProcessing, liveSettings, debugMode]);

  /**
   * Handle incoming proximity data from other users
   */
  const handleProximityUpdate = useCallback((payload: any) => {
    if (!payload.userId || payload.userId === user?.id) return;

    const proximityUser: ProximityUser = {
      userId: payload.userId,
      location: { lat: payload.lat, lng: payload.lng },
      accuracy: payload.accuracy || 50,
      timestamp: payload.timestamp || Date.now(),
      vibe: payload.vibe
    };

    nearbyUsersRef.current.set(payload.userId, proximityUser);

    // Clean up old proximity data (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [userId, user] of nearbyUsersRef.current) {
      if (user.timestamp < fiveMinutesAgo) {
        nearbyUsersRef.current.delete(userId);
      }
    }
  }, [user?.id]);

  /**
   * Start enhanced location sharing
   */
  const startSharing = useCallback(async () => {
    if (!user) return;

    try {
      // Set up real-time channel for proximity updates
      if (!channelRef.current) {
        channelRef.current = supabase
          .channel(`enhanced_location_${user.id}`)
          .on('broadcast', { event: 'enhanced_location_update' }, ({ payload }) => {
            handleProximityUpdate(payload);
          })
          .on('broadcast', { event: 'proximity_update' }, ({ payload }) => {
            handleProximityUpdate(payload);
          });

        await channelRef.current.subscribe();
      }

      // Set up periodic updates
      if (!updateTimerRef.current) {
        updateTimerRef.current = setInterval(() => {
          if (pos) {
            processLocationUpdate({ lat: pos.lat, lng: pos.lng }, pos.accuracy);
          }
        }, updateInterval);
      }

      setState(prevState => ({ ...prevState, isTracking: true }));

      if (debugMode) {
        console.log('[EnhancedLocation] Started enhanced location sharing');
      }
    } catch (error) {
      console.error('[EnhancedLocation] Start error:', error);
      toast({
        title: 'Enhanced Location Error',
        description: 'Failed to start enhanced location sharing',
        variant: 'destructive'
      });
    }
  }, [user, pos, processLocationUpdate, handleProximityUpdate, updateInterval, debugMode, toast]);

  /**
   * Stop enhanced location sharing
   */
  const stopSharing = useCallback(async () => {
    // Clean up channel
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Clean up timer
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
      updateTimerRef.current = null;
    }

    // Clear state
    setState(prevState => ({
      ...prevState,
      isTracking: false,
      nearbyUsers: [],
      proximityEvents: []
    }));

    nearbyUsersRef.current.clear();

    if (debugMode) {
      console.log('[EnhancedLocation] Stopped enhanced location sharing');
    }
  }, [debugMode]);

  // Process location updates when position changes
  useEffect(() => {
    if (pos && state.isTracking) {
      const currentLocation = { lat: pos.lat, lng: pos.lng };
      const lastLocation = lastLocationRef.current;
      
      // Only process if location has changed significantly (>10m) or it's been a while
      const shouldUpdate = !lastLocation || 
        Math.abs(currentLocation.lat - lastLocation.lat) > 0.0001 ||
        Math.abs(currentLocation.lng - lastLocation.lng) > 0.0001 ||
        Date.now() - state.lastUpdate > updateInterval;

      if (shouldUpdate) {
        processLocationUpdate(currentLocation, pos.accuracy);
      }
    }
  }, [pos, state.isTracking, state.lastUpdate, processLocationUpdate, updateInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSharing();
      proximityScorer.cleanupOldHistory();
    };
  }, [stopSharing]);

  return {
    // State
    ...state,
    loading,
    locationError,
    
    // Actions
    startSharing,
    stopSharing,
    
    // Enhanced features
    geofencingService,
    multiSignalVenueDetector,
    proximityScorer,
    
    // Utilities
    isLocationHidden: state.privacyLevel === 'hidden',
    hasActiveGeofences: state.geofenceMatches.length > 0,
    hasNearbyUsers: state.nearbyUsers.some(u => u.isNear),
    currentVenueConfidence: state.currentVenue?.overallConfidence || 0
  };
}