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

// Simple distance calculation in meters
const distanceInMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng1 - lng2) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

let lastPing: LocationPing | null = null;
let watchId: number | null = null;
let flushInterval: number | null = null;

export const useUserLocation = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Also provide the simplified pos interface for the FieldCanvas
  const pos = location ? {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy,
  } : null;

  const startTracking = () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    watchId = navigator.geolocation.watchPosition(
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
        setIsTracking(true);

        // Front-end location throttle - improved logic
        const newPing: LocationPing = {
          ts: new Date().toISOString(),
          lat: coords.latitude,
          lng: coords.longitude,
          acc: coords.accuracy
        };

        // Skip if too close to last ping
        if (locationBuffer.length &&
            Math.abs(coords.latitude - locationBuffer.at(-1)!.lat) < 0.00005 &&
            Date.now() - Date.parse(locationBuffer.at(-1)!.ts) < 12_000) {
          return; // skip duplicate
        }

        // Add to buffer for venue matching
        locationBuffer.push(newPing);
        lastPing = newPing;
      },
      err => {
        setError(err.message);
        setLoading(false);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,      // 30s cache for battery efficiency
        timeout: 10_000,
      },
    );

    // Flush location buffer every 15 seconds
    flushInterval = window.setInterval(async () => {
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
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (flushInterval !== null) {
      clearInterval(flushInterval);
      flushInterval = null;
    }
    setIsTracking(false);
    setLoading(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return { 
    location, 
    loading, 
    error, 
    pos, 
    isTracking, 
    startTracking, 
    stopTracking 
  };
};