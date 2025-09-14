import { useEffect, useState, useRef } from 'react';
import type { VenueClass } from '@/core/venues/types';
import { fetchVenue, classifyVenue } from '@/core/venues/service';
import { calculateDistance } from '@/lib/location/standardGeo';

const MIN_MOVE_M = 120;

export function useVenueContext() {
  const [venue, setVenue] = useState<VenueClass | null>(null);
  const [loading, setLoading] = useState(false);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    const run = async () => {
      try {
        if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
        
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (cancelled) return;
            
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            
            // Movement gate - only update if we've moved significantly
            const movedEnough = !lastLocationRef.current ||
              calculateDistance(lastLocationRef.current, { lat, lng }) > MIN_MOVE_M;
              
            if (!movedEnough) {
              setLoading(false);
              return;
            }
            
            lastLocationRef.current = { lat, lng };
            
            try {
              const venueClass = await classifyVenue(lat, lng);
              if (!cancelled) {
                setVenue(venueClass);
              }
            } catch (error) {
              console.error('Error classifying venue:', error);
            } finally {
              if (!cancelled) setLoading(false);
            }
          },
          () => {
            if (!cancelled) setLoading(false);
          },
          { 
            maximumAge: 60_000, 
            timeout: 4_000 
          }
        );
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    
    run();
    
    return () => { 
      cancelled = true; 
    };
  }, []);

  return { venue, loading };
}