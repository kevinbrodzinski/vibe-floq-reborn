
import { useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/providers/AuthProvider'
import { useCurrentVibe } from '@/lib/store/useVibe'
import { ngeohash } from 'ngeohash'

export const usePresencePublisher = (isActive: boolean) => {
  const { user } = useAuth()
  const vibe = useCurrentVibe()
  const watchIdRef = useRef<number | null>(null)
  const lastPublishRef = useRef<number>(0)

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
          p_vibe: vibe,
          p_gh5: gh5
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
    }

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      publishPresence,
      handleError,
      {
        enableHighAccuracy: false,
        timeout: 10000,
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
