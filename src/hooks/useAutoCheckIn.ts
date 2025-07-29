import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLiveSettings } from '@/hooks/useLiveSettings';
import { useUserLocation } from '@/hooks/useUserLocation';
import { metersBetween } from '@/lib/location/geo';
import { useToast } from '@/hooks/use-toast';

interface VenueCheckIn {
  venueId: string;
  name: string;
  checkedInAt: number;
  lastSeen: number;
}

const CHECK_IN_RADIUS = 50; // meters
const MIN_STAY_TIME = 300_000; // 5 minutes in milliseconds
const CHECK_INTERVAL = 30_000; // 30 seconds

/**
 * Auto check-in hook that detects when user arrives at venues
 * and automatically creates check-ins when enabled
 */
export const useAutoCheckIn = () => {
  const { data: liveSettings } = useLiveSettings();
  const { pos } = useUserLocation();
  const { toast } = useToast();
  
  const currentCheckInRef = useRef<VenueCheckIn | null>(null);
  const lastCheckRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);

  const checkForNearbyVenues = useCallback(async (lat: number, lng: number) => {
    try {
      const { data: venues, error } = await supabase.rpc('get_trending_venues', {
        p_lat: lat,
        p_lng: lng,
        p_radius_m: CHECK_IN_RADIUS,
        p_limit: 1
      });

      if (error) {
        console.error('Error checking nearby venues:', error);
        return;
      }

      if (venues && venues.length > 0) {
        const venue = venues[0];
        const now = Date.now();

        // Check if we're at a new venue
        if (!currentCheckInRef.current || currentCheckInRef.current.venueId !== venue.venue_id) {
          // Started being near a new venue
          currentCheckInRef.current = {
            venueId: venue.venue_id,
            name: venue.name,
            checkedInAt: now,
            lastSeen: now
          };
          console.log(`[AutoCheckIn] Started tracking venue: ${venue.name}`);
        } else {
          // Update last seen time for current venue
          currentCheckInRef.current.lastSeen = now;
          
          // Check if we've been here long enough to auto check-in
          const stayTime = now - currentCheckInRef.current.checkedInAt;
          if (stayTime >= MIN_STAY_TIME) {
            await performAutoCheckIn(currentCheckInRef.current);
            currentCheckInRef.current = null; // Reset after check-in
          }
        }
      } else {
        // No nearby venues, reset current check-in
        if (currentCheckInRef.current) {
          console.log(`[AutoCheckIn] Left venue area: ${currentCheckInRef.current.name}`);
          currentCheckInRef.current = null;
        }
      }
    } catch (error) {
      console.error('Error in auto check-in detection:', error);
    }
  }, []);

  const performAutoCheckIn = async (checkIn: VenueCheckIn) => {
    try {
      const { data, error } = await supabase.functions.invoke('auto-checkin', {
        body: {
          venue_id: checkIn.venueId,
          venue_name: checkIn.name,
          checked_in_at: new Date(checkIn.checkedInAt).toISOString()
        }
      });

      if (error) {
        console.error('Auto check-in failed:', error);
        return;
      }

      // Show success toast
      toast({
        title: 'Auto Check-in',
        description: `Checked in at ${checkIn.name}`,
        duration: 3000,
      });

      console.log(`[AutoCheckIn] Successfully checked in at: ${checkIn.name}`);
    } catch (error) {
      console.error('Error performing auto check-in:', error);
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