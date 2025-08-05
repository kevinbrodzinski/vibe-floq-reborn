
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VenueDetectionResult } from '@/types/location';

export function useAutoCheckIn() {
  const [detectedVenues, setDetectedVenues] = useState<VenueDetectionResult[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  const handleVenueDetection = async (lat: number, lng: number) => {
    if (isDetecting) return;
    
    setIsDetecting(true);
    try {
      const { data, error } = await supabase.rpc('venues_near_me', {
        user_lat: lat,
        user_lng: lng,
        radius_km: 0.1
      });

      if (error) throw error;

      const venues: VenueDetectionResult[] = Array.isArray(data) ? data.map((venue: any) => ({
        id: venue.id,
        name: venue.name || venue.venue_name || 'Unknown Venue',
        venue_id: venue.venue_id || venue.id,
        confidence: venue.confidence || 0.8,
        location: {
          lat: venue.lat || lat,
          lng: venue.lng || lng,
        },
        distance: venue.distance || 0,
      })) : [];

      setDetectedVenues(venues);

      // Auto check-in to the most confident venue
      if (venues.length > 0 && venues[0].confidence > 0.7) {
        const topVenue = venues[0];
        console.log(`Auto-checking into ${topVenue.name} with confidence ${topVenue.confidence}`);
        
        // Perform check-in logic here
        // Mock auto check-in - function doesn't exist yet
        console.log('Would auto check-in to venue:', topVenue.venue_id);
      }
    } catch (error) {
      console.error('Error in auto check-in:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  return {
    detectedVenues,
    isDetecting,
    handleVenueDetection,
  };
}
