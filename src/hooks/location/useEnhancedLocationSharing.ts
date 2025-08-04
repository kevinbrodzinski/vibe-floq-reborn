/**
 * Enhanced Location Sharing Hook
 * Integrates geofencing privacy zones, multi-signal venue detection, and proximity scoring
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useLiveSettings } from '@/hooks/useLiveSettings';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GPSCoords } from '@/lib/location/standardGeo';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Temporary simplified types for enhanced features
interface GeofenceMatch {
  geofence: any;
  distance: number;
  confidence: number;
}

interface VenueDetectionResult {
  venueId: string;
  overallConfidence: number;
  lat: number;
  lng: number;
}

interface ProximityUser {
  userId: string;
  location: GPSCoords;
  accuracy: number;
  timestamp: number;
  vibe?: string;
}

interface ProximityAnalysis {
  userId: string;
  distance: number;
  confidence: number;
  isNear: boolean;
  eventType?: 'enter' | 'exit' | 'sustain';
  sustainedDuration?: number;
}

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
  proximityEvents: string[]; // Recent proximity event descriptions
  
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

  const { pos, loading, error: locationError, isTracking } = useUserLocation();
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
      // Simplified background processing (disabled complex services)
      if (enableBackgroundProcessing) {
        // Simple geofence check (placeholder for now)
        const quickGeofenceCheck: GeofenceMatch[] = [];
        
        newState.geofenceMatches = quickGeofenceCheck;
        newState.privacyFiltered = false;
        newState.privacyLevel = 'exact';
        
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
        // Simplified geofencing (disabled complex service for now)
        geofenceMatches = [];
        privacyFiltered = false;
        privacyLevel = 'exact';

        newState.geofenceMatches = geofenceMatches;
        newState.privacyFiltered = privacyFiltered;
        newState.privacyLevel = privacyLevel;
      }

      // 2. Multi-Signal Venue Detection
      let venueDetections: VenueDetectionResult[] = [];
      let currentVenue: VenueDetectionResult | null = null;

      if (enableVenueDetection) {
        // Simplified venue detection (disabled complex service for now)
        venueDetections = [];
        currentVenue = null;

        newState.venueDetections = venueDetections;
        newState.currentVenue = currentVenue;
      }

      // 3. Proximity Analysis
      let nearbyUsers: ProximityAnalysis[] = [];
      const proximityEvents: string[] = [];

      if (enableProximityTracking) {
        // Simplified proximity tracking (disabled complex service for now)
        nearbyUsers = [];
        // No proximity events for now

        newState.nearbyUsers = nearbyUsers;
        newState.proximityEvents = proximityEvents;
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
      // proximityScorer.cleanupOldHistory(); // Disabled for now
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
    
    // Enhanced features (disabled for now)
    // geofencingService,
    // multiSignalVenueDetector,
    // proximityScorer,
    
    // Utilities
    isLocationHidden: state.privacyLevel === 'hidden',
    hasActiveGeofences: state.geofenceMatches.length > 0,
    hasNearbyUsers: state.nearbyUsers.some(u => u.isNear),
    currentVenueConfidence: state.currentVenue?.overallConfidence || 0
  };
}