import { useEffect, useState } from 'react';
import ngeohash from 'ngeohash';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface LocationData {
  coords: LocationCoords;
  geohash: string;
}

interface LocationPing {
  ts: string;
  lat: number;
  lng: number;
  acc?: number;
}

// Buffer for batching location pings
const locationBuffer: LocationPing[] = [];

export const useUserLocation = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Also provide the simplified pos interface for the FieldCanvas
  const pos = location ? {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy,
  } : null;

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const geohash = ngeohash.encode(coords.latitude, coords.longitude, 7);
        const locationData = {
          coords: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
          },
          geohash
        };
        
        setLocation(locationData);
        setLoading(false);
        setError(null);

        // Add to buffer for venue matching
        locationBuffer.push({
          ts: new Date().toISOString(),
          lat: coords.latitude,
          lng: coords.longitude,
          acc: coords.accuracy
        });
      },
      err => {
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,      // 30s cache for battery efficiency
        timeout: 10_000,
      },
    );

    // Flush location buffer every 15 seconds
    const flushInterval = setInterval(async () => {
      if (locationBuffer.length === 0 || !user) return;

      const batch = locationBuffer.splice(0, locationBuffer.length);
      
      try {
        await supabase.functions.invoke('record_locations', {
          body: { user_id: user.id, batch }
        });
        console.log(`Sent ${batch.length} location pings to server`);
      } catch (error) {
        console.error('Failed to send location batch:', error);
        // Put the batch back if failed (only once to avoid infinite retry)
        if (locationBuffer.length < 100) {
          locationBuffer.unshift(...batch);
        }
      }
    }, 15_000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(flushInterval);
    };
  }, [user]);

  return { location, loading, error, pos };
};