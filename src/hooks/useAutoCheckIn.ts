import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLiveSettings } from '@/hooks/useLiveSettings';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';
import { metersBetween } from '@/lib/location/geo';
import { useToast } from '@/hooks/use-toast';
import { multiSignalVenueDetector, type VenueDetectionResult } from '@/lib/location/multiSignalVenue';

interface VenueCheckIn {
  venueId: string;
  name: string;
  checkedInAt: number;
  lastSeen: number;
  confidence: number; // Add confidence tracking
  detectionMethod: 'enhanced' | 'gps_fallback'; // Track detection method
}

// Exported constants for testability
export const CHECK_IN_RADIUS = 50; // meters  
export const MIN_STAY_TIME = 300_000; // 5 minutes in milliseconds
export const CHECK_INTERVAL = 30_000; // 30 seconds
export const MIN_VENUE_CONFIDENCE = 0.6; // Minimum confidence for enhanced detection
export const MIN_FALLBACK_CONFIDENCE = 0.3; // Lower threshold for GPS fallback

/**
 * Enhanced auto check-in hook with multi-signal venue detection
 * Prioritizes enhanced venue detection, falls back to GPS-based detection
 */
export const useAutoCheckIn = () => {
  const { data: liveSettings } = useLiveSettings();
  const { coords } = useUnifiedLocation({
    enableTracking: true,
    enablePresence: false,
    hookId: 'auto-checkin'
  });
  const pos = coords; // Compatibility alias
  const { toast } = useToast();
  
  const currentCheckInRef = useRef<VenueCheckIn | null>(null);
  const lastCheckRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);
  const venueHistoryRef = useRef<Map<string, { lastSeen: number; confidence: number }>>(new Map());

  const checkForNearbyVenues = useCallback(async (lat: number, lng: number) => {
    try {
      let eligibleVenue: VenueDetectionResult | null = null;
      let detectionMethod: 'enhanced' | 'gps_fallback' = 'enhanced';
      
      // 1. Try enhanced multi-signal venue detection first
      try {
        const venueDetections = await multiSignalVenueDetector.detectVenues(
          { lat, lng },
          pos?.accuracy || 50
        );

        // Find the highest confidence venue that meets enhanced check-in criteria
        eligibleVenue = venueDetections
          .filter(detection => 
            detection.overallConfidence >= MIN_VENUE_CONFIDENCE && 
            detection.recommendedAction === 'check_in'
          )
          .sort((a, b) => b.overallConfidence - a.overallConfidence)[0] || null;

        if (eligibleVenue) {
          console.log(`[AutoCheckIn] Enhanced venue detected: ${eligibleVenue.venueId} (confidence: ${eligibleVenue.overallConfidence})`);
          
          // Update venue history for confidence tracking
          venueHistoryRef.current.set(eligibleVenue.venueId, {
            lastSeen: Date.now(),
            confidence: eligibleVenue.overallConfidence
          });
        }
      } catch (enhancedError) {
        console.warn('[AutoCheckIn] Enhanced venue detection failed, falling back to GPS:', enhancedError);
      }

      // 2. Fallback to traditional GPS-based venue detection if enhanced detection failed
      if (!eligibleVenue) {
        detectionMethod = 'gps_fallback';
        
        const { data: venues, error } = await supabase.rpc('get_trending_venues', {
          p_lat: lat,
          p_lng: lng,
          p_radius_m: CHECK_IN_RADIUS,
          p_limit: 5 // Get multiple venues for confidence scoring
        });

        if (error) {
          console.error('Error checking nearby venues:', error);
          return;
        }

        if (venues && venues.length > 0) {
          // Calculate confidence based on distance and popularity
          const venuesWithConfidence = venues.map((venue: any) => {
            const distance = metersBetween(
              lat, lng,
              venue.lat, venue.lng
            );
            
            // Simple confidence calculation: closer = higher confidence, popularity boost
            const distanceConfidence = Math.max(0, 1 - (distance / CHECK_IN_RADIUS));
            const popularityBoost = Math.min(0.3, venue.check_in_count * 0.01);
            const confidence = Math.min(1, distanceConfidence + popularityBoost);
            
            return {
              ...venue,
              distance,
              confidence,
              overallConfidence: confidence,
              venueId: venue.venue_id,
              recommendedAction: confidence >= MIN_FALLBACK_CONFIDENCE ? 'check_in' : 'observe'
            };
          });

          // Find the best venue
          eligibleVenue = venuesWithConfidence
            .filter(v => v.confidence >= MIN_FALLBACK_CONFIDENCE)
            .sort((a, b) => b.confidence - a.confidence)[0] || null;

          if (eligibleVenue) {
            console.log(`[AutoCheckIn] GPS fallback venue detected: ${eligibleVenue.venueId} (confidence: ${eligibleVenue.confidence})`);
          }
        }
      }

      // 3. Process venue check-in logic
      if (eligibleVenue) {
        const now = Date.now();

        // Check if we're at a new venue
        if (!currentCheckInRef.current || currentCheckInRef.current.venueId !== eligibleVenue.venueId) {
          // Started being near a new venue
          currentCheckInRef.current = {
            venueId: eligibleVenue.venueId,
            name: eligibleVenue.name || eligibleVenue.venueId || `Venue ${eligibleVenue.venueId}`,
            checkedInAt: now,
            lastSeen: now,
            confidence: eligibleVenue.overallConfidence,
            detectionMethod
          };
          console.log(`[AutoCheckIn] Started tracking venue: ${currentCheckInRef.current.name} (${detectionMethod}, confidence: ${eligibleVenue.overallConfidence})`);
        } else {
          // Update last seen time and confidence for current venue
          currentCheckInRef.current.lastSeen = now;
          currentCheckInRef.current.confidence = Math.max(
            currentCheckInRef.current.confidence,
            eligibleVenue.overallConfidence
          );
          
          // Check if we've been here long enough to auto check-in
          const stayTime = now - currentCheckInRef.current.checkedInAt;
          if (stayTime >= MIN_STAY_TIME) {
            const success = await performAutoCheckIn(currentCheckInRef.current);
            if (success) {
              currentCheckInRef.current = null; // Reset after successful check-in
            }
          }
        }
      } else {
        // No nearby venues, reset current check-in
        if (currentCheckInRef.current) {
          console.log(`[AutoCheckIn] Left venue area: ${currentCheckInRef.current.name}`);
          currentCheckInRef.current = null;
        }
      }
      
      // Clean up old venue history (older than 1 hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      for (const [venueId, history] of venueHistoryRef.current) {
        if (history.lastSeen < oneHourAgo) {
          venueHistoryRef.current.delete(venueId);
        }
      }
      
    } catch (error) {
      console.error('Error in enhanced auto check-in detection:', error);
    }
  }, [pos?.accuracy]);

  const performAutoCheckIn = async (checkIn: VenueCheckIn): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('auto-checkin', {
        body: {
          venue_id: checkIn.venueId,
          venue_name: checkIn.name,
          checked_in_at: new Date(checkIn.checkedInAt).toISOString(),
          // Enhanced metadata
          confidence: checkIn.confidence,
          detection_method: checkIn.detectionMethod,
          stay_duration: Date.now() - checkIn.checkedInAt
        }
      });

      if (error) {
        console.error('Auto check-in failed:', error);
        return false;
      }

      // Show enhanced success toast with confidence info
      toast({
        title: 'Auto Check-in',
        description: `Checked in at ${checkIn.name} (${Math.round(checkIn.confidence * 100)}% confidence)`,
        duration: 3000,
      });

      console.log(`[AutoCheckIn] Successfully checked in at: ${checkIn.name} (${checkIn.detectionMethod}, confidence: ${checkIn.confidence})`);
      return true;
    } catch (error) {
      console.error('Error performing enhanced auto check-in:', error);
      return false;
    }
  };

  const checkLocation = useCallback(() => {
    if (!pos || !liveSettings?.live_smart_flags?.auto_checkin) return;

    const now = Date.now();
    if (now - lastCheckRef.current < CHECK_INTERVAL) return;
    
    lastCheckRef.current = now;
    checkForNearbyVenues(pos.lat, pos.lng);
  }, [pos, liveSettings, checkForNearbyVenues]);

  // Set up interval for checking location
  useEffect(() => {
    if (liveSettings?.live_smart_flags?.auto_checkin && pos) {
      intervalRef.current = setInterval(checkLocation, CHECK_INTERVAL);
      // Run initial check
      checkLocation();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      currentCheckInRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [liveSettings?.live_smart_flags?.auto_checkin, pos, checkLocation]);

  return {
    isEnabled: !!liveSettings?.live_smart_flags?.auto_checkin,
    currentVenue: currentCheckInRef.current?.name || null,
    isTracking: !!currentCheckInRef.current,
  };
};