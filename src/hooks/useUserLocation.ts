import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

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
  ts: string
  lat: number
  lng: number
  acc?: number
}

// Location tracking hook with throttling and batching
export function useUserLocation() {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const bufferRef = useRef<LocationPing[]>([])
  const watchIdRef = useRef<number | null>(null)
  const flushIntervalRef = useRef<number | null>(null)
  const lastPresenceBroadcast = useRef<number>(0)
  const { toast } = useToast()

  // Also provide the simplified pos interface for the FieldCanvas
  const pos = location ? {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy,
  } : null

  const flushBuffer = async () => {
    if (bufferRef.current.length === 0) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const batch = bufferRef.current.splice(0, bufferRef.current.length)
      
      const { error } = await supabase.functions.invoke('record_locations', {
        body: { batch }  // ✅ No user_id - edge function gets it from JWT
      })

      if (error) {
        console.error('Failed to record locations:', error)
      }
    } catch (err) {
      console.error('Location flush error:', err)
    }
  }

  const startTracking = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const permission = await navigator.permissions?.query({ name: 'geolocation' })
      if (permission?.state === 'denied') {
        setError('Location permission denied')
        setLoading(false)
        return
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude: lat, longitude: lng, accuracy: acc } = position.coords
          
          // Update location state for UI
          const locationData = {
            coords: {
              latitude: lat,
              longitude: lng,
              accuracy: acc,
            },
            geohash: '' // Can add geohash if needed
          }
          setLocation(locationData)

          const newPing: LocationPing = {
            ts: new Date().toISOString(),
            lat,
            lng,
            acc
          }

          // Throttle: skip if too close to last ping (within 20m and 20s)
          const lastPing = bufferRef.current.at(-1)
          if (lastPing) {
            const timeDiff = Date.now() - new Date(lastPing.ts).valueOf()
            const distance = Math.sqrt(
              Math.pow((lat - lastPing.lat) * 111000, 2) + 
              Math.pow((lng - lastPing.lng) * 111000, 2)
            )
            
            if (distance < 20 && timeDiff < 20_000) {
              return // Skip duplicate/jitter
            }
          }

          bufferRef.current.push(newPing)

          // Presence broadcast (throttled to every 10 seconds)
          const now = Date.now()
          if (now - lastPresenceBroadcast.current > 10000) {
            // Check if user has enabled live sharing with any friends
            const broadcastPresence = async () => {
              try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                  const { data } = await supabase
                    .from('friend_share_pref')
                    .select('is_live')
                    .eq('is_live', true)
                    .limit(1)
                    .maybeSingle()
                  
                  if (data?.is_live) {
                    supabase.channel(`presence_${user.id}`)
                      .send({
                        type: 'broadcast',
                        event: 'live_pos',
                        payload: { lat, lng, acc, ts: now }
                      })
                    lastPresenceBroadcast.current = now
                  }
                }
              } catch (error) {
                console.error('Error broadcasting presence:', error)
              }
            }
            broadcastPresence()
          }
          
          if (!isTracking) {
            setIsTracking(true)
            setLoading(false)
            setError(null)
          }
        },
        (err) => {
          console.error('Geolocation error:', err)
          setError(err.message)
          setLoading(false)
          setIsTracking(false)
        },
        {
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 30000
        }
      )

      watchIdRef.current = watchId

      // Flush buffer every 15 seconds
      flushIntervalRef.current = setInterval(flushBuffer, 15_000)

    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current)
      flushIntervalRef.current = null
    }
    
    // Final flush
    flushBuffer()
    
    setIsTracking(false)
    setLoading(false)
    setError(null)
  }

  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [])

  return {
    location,
    isTracking,
    loading,
    error,
    pos,
    startTracking,
    stopTracking
  }
}