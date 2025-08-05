import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import throttle from 'lodash-es/throttle'

export interface NearbyRow {
  profile_id: string | null
  vibe: string | null
  meters: number | null          // renamed from distance_m for clarity
  synthetic_id?: string          // unique identifier for both real and demo users
}

export const useNearbyPeople = (lat?: number, lng?: number, limit = 12) => {
  const [people, setPeople] = useState<NearbyRow[]>([])
  const [loading, setLoading] = useState(false)

  // throttled fetcher using database RPC function
  const throttledFetch = useRef(
    throttle(async (lat: number, lng: number, limit: number) => {
      try {
        setLoading(true)
        
        // Use the database RPC function instead of edge function
        const { data, error } = await supabase.rpc('rank_nearby_people', {
          p_lat: lat,
          p_lng: lng,
          p_limit: limit
        })
        
        if (error) throw error
        
        // Transform the data to match expected interface
        setPeople(
          (data || [])
            .filter(r => Number.isFinite(r.meters))
            .map(r => ({
              profile_id: r.profile_id,
              vibe: r.vibe,
              meters: r.meters,
              synthetic_id: r.synthetic_id
            }))
        )
      } catch (err) {
        console.error('[useNearbyPeople]', err)
        setPeople([])
      } finally {
        setLoading(false)
      }
    }, 2_000)
  ).current

  useEffect(() => {
    // Only fetch when we have coordinates
    if (lat == null || lng == null) return
    throttledFetch(lat, lng, limit)              // first call
    const id = setInterval(() => throttledFetch(lat, lng, limit), 45_000)
    return () => clearInterval(id)
  }, [lat, lng, limit])

  return { people, loading }
}