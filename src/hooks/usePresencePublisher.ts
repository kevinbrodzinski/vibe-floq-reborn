
import { useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/providers/AuthProvider'
import { useCurrentVibe } from '@/lib/store/useVibe'
import ngeohash from 'ngeohash'

interface CachedCoords {
  latitude: number
  longitude: number
  timestamp: number
}

export const usePresencePublisher = (isActive: boolean) => {
  const { user } = useAuth()
  const vibe = useCurrentVibe()
  const watchIdRef = useRef<number | null>(null)
  const lastPublishRef = useRef<number>(0)

  // Cache coordinates for fallback
  const cacheCoordinates = (coords: GeolocationCoordinates) => {
    const cached: CachedCoords = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: Date.now()
    }
    localStorage.setItem('lastCoords', JSON.stringify(cached))
  }

  const getCachedCoordinates = (): CachedCoords | null => {
    try {
      const cached = localStorage.getItem('lastCoords')
      if (!cached) return null
      
      const coords = JSON.parse(cached) as CachedCoords
      // Use cached coordinates if they're less than 10 minutes old
      if (Date.now() - coords.timestamp < 10 * 60 * 1000) {
        return coords
      }
    } catch (error) {
      console.warn('[PRESENCE_PUBLISHER] Failed to parse cached coordinates:', error)
    }
    return null
  }

  useEffect(() => {
    if (!isActive || !user || !vibe) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
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
        user_id: user.id
      })

      try {
        const { data, error } = await supabase.rpc('upsert_presence', {
          p_lat: latitude,
          p_lng: longitude,
          p_vibe: vibe
        })

        if (error) {
          console.error('[PRESENCE_PUBLISHER] Error upserting presence:', error)
        } else {
          console.log('[PRESENCE_PUBLISHER] Presence upserted successfully')
          lastPublishRef.current = now
        }
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
      const cached = getCachedCoordinates()
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
        publishPresence(fallbackPosition)
      }
    }

    // Start watching position with increased timeout
    watchIdRef.current = navigator.geolocation.watchPosition(
      publishPresence,
      handleError,
      {
        enableHighAccuracy: false,
        timeout: 30000, // Increased from 10000 to 30000
        maximumAge: 30000
      }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [isActive, user, vibe])
}
