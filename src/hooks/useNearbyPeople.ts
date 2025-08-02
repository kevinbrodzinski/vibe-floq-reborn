import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import throttle from 'lodash-es/throttle'
import { useFriendDrawer } from '@/contexts/FriendDrawerContext'

export interface NearbyRow {
  profile_id: string | null
  vibe: string | null
  meters: number | null          // renamed from distance_m for clarity
}

export const useNearbyPeople = (lat?: number, lng?: number, limit = 12) => {
  const [people, setPeople] = useState<NearbyRow[]>([])
  const [loading, setLoading] = useState(false)
  const tokenRef = useRef<string | null>(null)
  const { open } = useFriendDrawer()

  // keep auth-token fresh
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      tokenRef.current = data.session?.access_token || null
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      tokenRef.current = s?.access_token || null
    })
    return () => subscription.unsubscribe()
  }, [])

  // throttled fetcher (1×/2 s max)
  const throttledFetch = useRef(
    throttle(async (lat: number, lng: number, limit: number) => {
      try {
        setLoading(true)
        const url = `https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1/nearby_people` +
                    `?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}&limit=${limit}`
        const res = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...(tokenRef.current && { Authorization: `Bearer ${tokenRef.current}` })
          }
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        
        const raw = (await res.json()) as NearbyRow[]
        
        // 💡 normalize + filter • only keep rows with a finite distance
        setPeople(
          raw
            .filter(r => Number.isFinite(r.meters))         // drop null / NaN
            .map(r => ({
              ...r,
              distance_m: r.meters!,                        // align naming
              meters: r.meters!                             // keep original for compatibility
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
    // Only fetch when drawer is open and we have coordinates
    if (!open || lat == null || lng == null) return
    throttledFetch(lat, lng, limit)              // first call
    const id = setInterval(() => throttledFetch(lat, lng, limit), 45_000)
    return () => clearInterval(id)
  }, [lat, lng, limit, open])

  return { people, loading }
}