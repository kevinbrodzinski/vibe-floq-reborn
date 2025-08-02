import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import throttle from 'lodash.throttle'

export interface NearbyRow {
  profile_id: string
  vibe: string
  meters: number
}

export const useNearbyPeople = (lat?: number, lng?: number, limit = 12) => {
  const [people, setPeople] = useState<NearbyRow[]>([])
  const [loading, setLoading] = useState(false)
  const tokenRef = useRef<string | null>(null)

  // Cache auth token
  useEffect(() => {
    const getToken = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      tokenRef.current = session?.access_token || null
    }
    getToken()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      tokenRef.current = session?.access_token || null
    })

    return () => subscription.unsubscribe()
  }, [])

  // Throttled fetch function
  const fetchNearby = useRef(
    throttle(async (lat: number, lng: number, limit: number) => {
      try {
        setLoading(true)
        const precisionLat = lat.toFixed(6)
        const precisionLng = lng.toFixed(6)
        
        const url = `https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1/nearby_people?lat=${precisionLat}&lng=${precisionLng}&limit=${limit}`
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${tokenRef.current || ''}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        setPeople(data || [])
      } catch (error) {
        console.error('Error fetching nearby people:', error)
        setPeople([])
      } finally {
        setLoading(false)
      }
    }, 2000) // Throttle to max once per 2 seconds
  ).current

  useEffect(() => {
    if (lat == null || lng == null) return

    fetchNearby(lat, lng, limit)
    const interval = setInterval(() => fetchNearby(lat, lng, limit), 45_000)
    return () => clearInterval(interval)
  }, [lat, lng, limit, fetchNearby])

  return { people, loading }
}