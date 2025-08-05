
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
      const { data, error } = await supabase.rpc('detect_nearby_venues', {
        lat,
        lng,
        radius: 100
      });

      if (error) throw error;

      const venues: VenueDetectionResult[] = (data || []).map((venue: any) => ({
        id: venue.id,
        name: venue.name || venue.venue_name || 'Unknown Venue',
        venue_id: venue.venue_id || venue.id,
        confidence: venue.confidence || 0.8,
        location: {
          lat: venue.lat || lat,
          lng: venue.lng || lng,
        },
        distance: venue.distance || 0,
      }));

      setDetectedVenues(venues);

      // Auto check-in to the most confident venue
      if (venues.length > 0 && venues[0].confidence > 0.7) {
        const topVenue = venues[0];
        console.log(`Auto-checking into ${topVenue.name} with confidence ${topVenue.confidence}`);
        
        // Perform check-in logic here
        await supabase.rpc('auto_checkin', {
          venue_id: topVenue.venue_id,
          confidence: topVenue.confidence
        });
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
