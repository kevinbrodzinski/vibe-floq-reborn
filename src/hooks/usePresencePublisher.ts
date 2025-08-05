
import { useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/EnhancedAuthProvider'
import { useCurrentVibe } from '@/lib/store/useVibe'
import { storage } from '@/lib/storage'
import { executeWithCircuitBreaker } from '@/lib/database/CircuitBreaker'
import { globalLocationManager } from '@/lib/location/GlobalLocationManager'
import ngeohash from 'ngeohash'

interface CachedCoords {
  latitude: number
  longitude: number
  timestamp: number
}

export const usePresencePublisher = (isActive: boolean) => {
  const { user } = useAuth()
  const vibe = useCurrentVibe()
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const lastPublishRef = useRef<number>(0)

  // Cache coordinates for fallback
  const cacheCoordinates = (coords: GeolocationCoordinates) => {
    const cached: CachedCoords = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: Date.now()
    }
    storage.setJSON('lastCoords', cached).catch(console.error);
  }

  const getCachedCoordinates = async (): Promise<CachedCoords | null> => {
    try {
      const coords = await storage.getJSON<CachedCoords>('lastCoords');
      if (!coords) return null;
      
      // Use cached coordinates if they're less than 10 minutes old
      if (Date.now() - coords.timestamp < 10 * 60 * 1000) {
        return coords;
      }
    } catch (error) {
      console.warn('[PRESENCE_PUBLISHER] Failed to parse cached coordinates:', error);
    }
    return null;
  }

  useEffect(() => {
    if (!isActive || !user || !vibe) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      return
    }

    console.log('[PRESENCE_PUBLISHER] Starting location watch with vibe:', vibe)

      const publishPresence = async (position: GeolocationPosition) => {
    const now = Date.now()
    
    // Throttle to max once per 30 seconds
    if (now - lastPublishRef.current < 30000) {
      return
    }

    const { latitude, longitude } = position.coords
    
    // Cache coordinates for fallback
    cacheCoordinates(position.coords)
    
    const gh5 = ngeohash.encode(latitude, longitude, 5)
    
    console.log('[PRESENCE_PUBLISHER] Publishing presence:', {
      lat: latitude,
      lng: longitude,
      vibe,
      gh5,
      profile_id: user.id
    })

    try {
      // Use circuit breaker to protect database from overload
      await executeWithCircuitBreaker(
        async () => {
          const { data, error } = await supabase.rpc('upsert_presence', {
            p_lat: latitude,
            p_lng: longitude,
            p_vibe: vibe,
            p_visibility: 'public'
          } as any);
          
          if (error) throw error;
          return data;
        },
        'medium',
        {
          component: 'presence-publisher',
          operationType: 'presence-upsert'
        }
      )

      console.log('[PRESENCE_PUBLISHER] Presence upserted successfully')
      lastPublishRef.current = now
    } catch (err) {
      console.error('[PRESENCE_PUBLISHER] Exception upserting presence:', err)
    }
  }

    const handleError = (error: GeolocationPositionError) => {
      console.error('[PRESENCE_PUBLISHER] Geolocation error:', {
        code: error.code,
        message: error.message
      })
      
      // Try to use cached coordinates as fallback
      getCachedCoordinates().then(cached => {
        if (cached) {
        console.log('[PRESENCE_PUBLISHER] Using cached coordinates as fallback')
        const fallbackPosition = {
          coords: {
            latitude: cached.latitude,
            longitude: cached.longitude,
            accuracy: 1000, // Lower accuracy for cached data
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: cached.timestamp
        } as GeolocationPosition
        publishPresence(fallbackPosition);
        }
      }).catch(console.error);
    }

    // Use global location manager instead of direct watchPosition
    unsubscribeRef.current = globalLocationManager.subscribe(
      `presence-publisher-${user.id}`,
      (coords) => {
        // Create mock GeolocationPosition from coords
        const position: GeolocationPosition = {
          coords: {
            latitude: coords.lat,
            longitude: coords.lng,
            accuracy: coords.accuracy || 50,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: function() { return this; }
          },
          timestamp: Date.now(),
          toJSON: function() { return this; }
        };
        publishPresence(position);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [isActive, user, vibe])
}
