import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface NearbyRow {
  profile_id: string
  vibe: string
  meters: number
}

export const useNearbyPeople = (lat?: number, lng?: number, limit = 12) => {
  const [people, setPeople] = useState<NearbyRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (lat == null || lng == null) return

    setLoading(true)
    const fetchNearby = async () => {
      try {
        const url = `https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1/nearby_people?lat=${lat}&lng=${lng}&limit=${limit}`
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
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
    }

    fetchNearby()
    const interval = setInterval(fetchNearby, 45_000)
    return () => clearInterval(interval)
  }, [lat, lng, limit])

  return { people, loading }
}