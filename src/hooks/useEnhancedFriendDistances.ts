/**
 * Enhanced Friend Distance Detection System
 * Integrates with the new enhanced location system to provide accurate friend distances
 * with confidence scoring, privacy controls, and real-time updates
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useLiveShareFriends } from '@/hooks/useLiveShareFriends';
import { geofencingService } from '@/lib/location/geofencing';
import { proximityScorer, type ProximityUser, type ProximityAnalysis } from '@/lib/location/proximityScoring';
import { calculateDistance, formatDistance, type GPSCoords } from '@/lib/location/standardGeo';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface FriendLocation {
  profileId: string;
  displayName: string | null;
  avatarUrl: string | null;
  location: GPSCoords;
  accuracy: number;
  timestamp: number;
  vibe: string | null;
  venueId: string | null;
  visibility: 'public' | 'friends' | 'private';
}

export interface FriendDistance {
  friend: FriendLocation;
  distance: number; // meters
  formattedDistance: string; // "150m" or "2.1km"
  confidence: number; // 0-1 confidence score
  reliability: 'high' | 'medium' | 'low';
  proximityAnalysis: ProximityAnalysis;
  isNearby: boolean; // within proximity threshold
  lastSeen: number; // timestamp of last location update
  privacyFiltered: boolean; // if distance is degraded due to privacy
}

export interface FriendDistanceOptions {
  maxDistance?: number; // max distance to include (meters)
  updateInterval?: number; // how often to recalculate (ms)
  enableProximityTracking?: boolean;
  enablePrivacyFiltering?: boolean;
  sortBy?: 'distance' | 'lastSeen' | 'confidence';
  includeOffline?: boolean; // include friends without recent location
}

export interface FriendDistanceState {
  friends: FriendDistance[];
  nearbyCount: number;
  totalFriends: number;
  lastUpdate: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Enhanced hook for friend distance detection with privacy and confidence scoring
 */
export function useEnhancedFriendDistances(options: FriendDistanceOptions = {}) {
  const {
    maxDistance = 10000, // 10km default
    updateInterval = 30000, // 30 seconds
    enableProximityTracking = true,
    enablePrivacyFiltering = true,
    sortBy = 'distance',
    includeOffline = false
  } = options;

  const { user } = useAuth();
  const { pos } = useUserLocation();
  const liveShareFriends = useLiveShareFriends();
  const queryClient = useQueryClient();

  const [state, setState] = useState<FriendDistanceState>({
    friends: [],
    nearbyCount: 0,
    totalFriends: 0,
    lastUpdate: 0,
    isLoading: false,
    error: null
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const friendLocationsRef = useRef<Map<string, FriendLocation>>(new Map());
  const updateTimerRef = useRef<number | null>(null);

  /**
   * Fetch friend locations from the database
   */
  const { data: friendLocations = [], isLoading, error } = useQuery({
    queryKey: ['friend-locations', user?.id, liveShareFriends],
    queryFn: async () => {
      if (!user || liveShareFriends.length === 0) return [];

      // Get current presence data for friends who are sharing location
      const { data, error } = await supabase.rpc('presence_nearby', {
        lat: pos?.lat || 0,
        lng: pos?.lng || 0,
        km: maxDistance / 1000, // convert to km
        include_self: false
      });

      if (error) {
        console.error('[FriendDistances] Error fetching friend locations:', error);
        throw error;
      }

      // Filter to only include friends who are sharing with us
      const friendData: FriendLocation[] = [];
      
      for (const presence of data || []) {
        if (liveShareFriends.includes(presence.profile_id)) {
          // Extract location from PostGIS geometry
          let location: GPSCoords | null = null;
          
          if (presence.location) {
            // Handle different location formats
            if (presence.location.coordinates) {
              const [lng, lat] = presence.location.coordinates;
              location = { lat, lng };
            } else if (presence.geo && presence.geo.coordinates) {
              const [lng, lat] = presence.geo.coordinates;
              location = { lat, lng };
            }
          }

          if (location) {
            friendData.push({
              profileId: presence.profile_id,
              displayName: presence.display_name || null,
              avatarUrl: presence.avatar_url || null,
              location,
              accuracy: presence.accuracy || 50,
              timestamp: new Date(presence.updated_at || presence.created_at).getTime(),
              vibe: presence.vibe || null,
              venueId: presence.venue_id || null,
              visibility: presence.visibility || 'friends'
            });
          }
        }
      }

      return friendData;
    },
    enabled: !!user && !!pos && liveShareFriends.length > 0,
    staleTime: 30000, // 30 seconds
    refetchInterval: updateInterval,
  });

  /**
   * Calculate distances and apply enhanced analysis
   */
  const calculateFriendDistances = useCallback(() => {
    if (!pos || !user) return;

    const now = Date.now();
    const friendDistances: FriendDistance[] = [];

    // Update friend locations cache
    friendLocations.forEach(friend => {
      friendLocationsRef.current.set(friend.profileId, friend);
    });

    // Calculate distances for all cached friends
    for (const [profileId, friend] of friendLocationsRef.current) {
      try {
        // Calculate basic distance
        const distance = calculateDistance(pos, friend.location);
        
        // Skip if beyond max distance
        if (distance > maxDistance) continue;

        // Check if friend data is stale
        const dataAge = now - friend.timestamp;
        const isStale = dataAge > 5 * 60 * 1000; // 5 minutes
        
        if (!includeOffline && isStale) continue;

        // Apply privacy filtering if enabled
        let actualDistance = distance;
        let privacyFiltered = false;
        
        if (enablePrivacyFiltering) {
          const geofenceMatches = geofencingService.checkGeofences(friend.location, friend.accuracy);
          if (geofenceMatches.length > 0) {
            const highConfidenceMatches = geofenceMatches.filter(m => m.confidence > 0.7);
            if (highConfidenceMatches.length > 0) {
              const mostRestrictive = highConfidenceMatches.reduce((prev, current) => {
                const prevLevel = prev.geofence.privacyLevel === 'hide' ? 3 : 
                                 prev.geofence.privacyLevel === 'area' ? 2 : 1;
                const currentLevel = current.geofence.privacyLevel === 'hide' ? 3 : 
                                    current.geofence.privacyLevel === 'area' ? 2 : 1;
                return currentLevel > prevLevel ? current : prev;
              });

              if (mostRestrictive.geofence.privacyLevel === 'hide') {
                continue; // Skip hidden friends
              } else if (mostRestrictive.geofence.privacyLevel === 'area') {
                // Degrade distance accuracy to ~1km
                actualDistance = Math.max(distance, 1000);
                privacyFiltered = true;
              } else if (mostRestrictive.geofence.privacyLevel === 'street') {
                // Degrade distance accuracy to ~100m
                actualDistance = Math.max(distance, 100);
                privacyFiltered = true;
              }
            }
          }
        }

        // Enhanced proximity analysis
        let proximityAnalysis: ProximityAnalysis | null = null;
        let confidence = 1.0;
        let reliability: 'high' | 'medium' | 'low' = 'medium';

        if (enableProximityTracking) {
          const currentUser: ProximityUser = {
            userId: user.id, // Keep userId for proximity system as it uses auth.uid()
            location: pos,
            accuracy: pos.accuracy,
            timestamp: now
          };

          const friendUser: ProximityUser = {
            userId: friend.profileId, // Use profileId as userId for consistency
            location: friend.location,
            accuracy: friend.accuracy,
            timestamp: friend.timestamp
          };

          proximityAnalysis = proximityScorer.analyzeProximity(currentUser, friendUser);
          confidence = proximityAnalysis.confidence;
          reliability = proximityAnalysis.reliability;
        } else {
          // Basic confidence calculation without proximity tracking
          const combinedAccuracy = Math.sqrt(pos.accuracy ** 2 + friend.accuracy ** 2);
          const accuracyFactor = Math.max(0.1, 1 - combinedAccuracy / 200);
          const freshnessDecay = Math.max(0.1, 1 - dataAge / (10 * 60 * 1000)); // 10 min decay
          confidence = accuracyFactor * freshnessDecay;
          
          if (pos.accuracy <= 20 && friend.accuracy <= 20 && dataAge < 2 * 60 * 1000) {
            reliability = 'high';
          } else if (pos.accuracy <= 50 && friend.accuracy <= 50 && dataAge < 5 * 60 * 1000) {
            reliability = 'medium';
          } else {
            reliability = 'low';
          }
        }

        const friendDistance: FriendDistance = {
          friend,
          distance: actualDistance,
          formattedDistance: formatDistance(actualDistance),
          confidence,
          reliability,
          proximityAnalysis: proximityAnalysis || {
            distance: actualDistance,
            confidence,
            isNear: actualDistance <= 200,
            wasNear: false,
            eventType: 'none',
            sustainedDuration: 0,
            reliability
          },
          isNearby: actualDistance <= 200, // 200m proximity threshold
          lastSeen: friend.timestamp,
          privacyFiltered
        };

        friendDistances.push(friendDistance);
      } catch (error) {
        console.error(`[FriendDistances] Error calculating distance for ${profileId}:`, error);
      }
    }

    // Sort friends based on preference
    friendDistances.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.distance - b.distance;
        case 'lastSeen':
          return b.lastSeen - a.lastSeen;
        case 'confidence':
          return b.confidence - a.confidence;
        default:
          return a.distance - b.distance;
      }
    });

    // Update state
    setState(prevState => ({
      ...prevState,
      friends: friendDistances,
      nearbyCount: friendDistances.filter(f => f.isNearby).length,
      totalFriends: friendDistances.length,
      lastUpdate: now,
      isLoading: false,
      error: null
    }));

    // Console log for debugging (development only)
    if (process.env.NODE_ENV !== 'production' && friendDistances.length > 0) {
      console.log(`🚀 Enhanced Friend Distances: ${friendDistances.length} friends, ${friendDistances.filter(f => f.isNearby).length} nearby, ${friendDistances.filter(f => f.confidence > 0.8).length} high confidence`);
    }

  }, [pos, user, friendLocations, maxDistance, includeOffline, enablePrivacyFiltering, enableProximityTracking, sortBy]);

  /**
   * Handle real-time location updates from friends
   */
  const handleFriendLocationUpdate = useCallback((payload: any) => {
    if (!payload.profile_id || payload.profile_id === user?.id) return;

    const friendLocation: FriendLocation = {
      profileId: payload.profile_id,
      displayName: payload.display_name || null,
      avatarUrl: payload.avatar_url || null,
      location: { lat: payload.lat, lng: payload.lng },
      accuracy: payload.accuracy || 50,
      timestamp: payload.timestamp || Date.now(),
      vibe: payload.vibe || null,
      venueId: payload.venue_id || null,
      visibility: payload.visibility || 'friends'
    };

    // Update cache
    friendLocationsRef.current.set(payload.profile_id, friendLocation);

    // Trigger recalculation
    calculateFriendDistances();
  }, [user?.id, calculateFriendDistances]);

  /**
   * Set up real-time subscriptions
   */
  useEffect(() => {
    if (!user || liveShareFriends.length === 0) return;

    // Subscribe to friend location updates
    channelRef.current = supabase
      .channel(`friend_locations_${user.id}`)
      .on('broadcast', { event: 'enhanced_location_update' }, ({ payload }) => {
        if (liveShareFriends.includes(payload.profile_id)) {
          handleFriendLocationUpdate(payload);
        }
      })
      .on('broadcast', { event: 'presence_update' }, ({ payload }) => {
        if (liveShareFriends.includes(payload.profile_id)) {
          handleFriendLocationUpdate(payload);
        }
      });

    channelRef.current.subscribe();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, liveShareFriends, handleFriendLocationUpdate]);

  /**
   * Calculate distances when position or friend data changes
   */
  useEffect(() => {
    if (!isLoading && friendLocations.length > 0) {
      calculateFriendDistances();
    }
  }, [friendLocations, pos, calculateFriendDistances, isLoading]);

  /**
   * Set up periodic recalculation
   */
  useEffect(() => {
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
    }

    updateTimerRef.current = setInterval(() => {
      calculateFriendDistances();
    }, updateInterval);

    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
    };
  }, [calculateFriendDistances, updateInterval]);

  // Update loading state
  useEffect(() => {
    setState(prevState => ({
      ...prevState,
      isLoading,
      error: error?.message || null
    }));
  }, [isLoading, error]);

  /**
   * Get friends within a specific distance
   */
  const getFriendsWithinDistance = useCallback((maxDist: number) => {
    return state.friends.filter(f => f.distance <= maxDist);
  }, [state.friends]);

  /**
   * Get friend by profile ID
   */
  const getFriendDistance = useCallback((profileId: string) => {
    return state.friends.find(f => f.friend.profileId === profileId);
  }, [state.friends]);

  /**
   * Force refresh friend locations
   */
  const refreshFriendLocations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['friend-locations'] });
    calculateFriendDistances();
  }, [queryClient, calculateFriendDistances]);

  return {
    // State
    ...state,
    
    // Computed values
    hasNearbyFriends: state.nearbyCount > 0,
    averageDistance: state.friends.length > 0 
      ? state.friends.reduce((sum, f) => sum + f.distance, 0) / state.friends.length 
      : 0,
    highConfidenceFriends: state.friends.filter(f => f.confidence > 0.8),
    
    // Actions
    getFriendsWithinDistance,
    getFriendDistance,
    refreshFriendLocations,
    
    // Utilities
    formatDistance,
    calculateDistance: (coords: GPSCoords) => pos ? calculateDistance(pos, coords) : 0,
    
    // Advanced features
    proximityScorer,
    geofencingService
  };
}