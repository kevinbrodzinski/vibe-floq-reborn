import { useEffect, useState } from 'react';
import type { VenueClass } from '@/core/venues/types';
import { fetchVenue } from '@/core/venues/service';

export function useVenueContext() {
  const [venue, setVenue] = useState<VenueClass | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    
    const run = async () => {
      try {
        if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
        
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (cancelled) return;
            
            try {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              const venueData = await fetchVenue(lat, lng);
              
              if (!cancelled && venueData) {
                // Convert venue payload to VenueClass
                const venueClass: VenueClass = {
                  type: 'general', // Will be enhanced by category mapper
                  energyBase: 0.5,
                  name: venueData.name || undefined,
                  provider: venueData.providers?.[0] as any || 'gps',
                  lat,
                  lng,
                  categories: venueData.categories,
                  confidence01: venueData.confidence || 0.5
                };
                
                setVenue(venueClass);
              }
            } catch (error) {
              console.error('Error fetching venue:', error);
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