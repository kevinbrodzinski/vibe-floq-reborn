import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { supabase } from '@/integrations/supabase/client'
import { useUserLocation } from './useUserLocation'
import { useCurrentVibe } from '@/lib/store/useVibe'
import { getEnvironmentConfig } from '@/lib/environment'

export interface Hotspot {
  gh6: string
  centroid: { type: 'Point'; coordinates: [number, number] }
  dom_vibe: string
  delta: number
  total_now: number
  user_cnt: number
}

const fetchHotspots = async (lat: number, lng: number, vibe: string): Promise<Hotspot[]> => {
  const { data, error } = await supabase.functions.invoke('get_hotspots', {
    body: {
      lat,
      lng,
      vibe,
      radius: 1500
    }
  })

  if (error) {
    console.error('[useHotspots] Edge function error:', error)
    throw error
  }

  return data || []
}

export const useHotspots = () => {
  const { location } = useUserLocation()
  const vibe = useCurrentVibe()
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const env = getEnvironmentConfig()

  // SWR key for caching and revalidation
  const swrKey = !env.hotSpotHalos || !location || !vibe
    ? null
    : `hotspots:${vibe}:${location.coords.latitude.toFixed(3)}:${location.coords.longitude.toFixed(3)}`

  const { data, error, mutate } = useSWR(
    swrKey,
    () => fetchHotspots(location!.coords.latitude, location!.coords.longitude, vibe!),
    {
      refreshInterval: 60000, // Refresh every 60 seconds
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
      onSuccess: (data) => {
        if (data) {
          setHotspots(data)
          if (import.meta.env.DEV) {
            console.log(`[useHotspots] Received ${data.length} hotspots via SWR`)
          }
        }
      },
      onError: (error) => {
        console.error('[useHotspots] SWR error:', error)
      }
    }
  )

  // Real-time subscription to hotspots_updated channel
  useEffect(() => {
    if (!env.hotSpotHalos) return

    const channel = supabase
      .channel('hotspots-realtime')
      .on(
        'broadcast',
        { event: 'hotspots_updated' },
        (payload) => {
          try {
            const newHotspots = payload.payload as Hotspot[]
            if (Array.isArray(newHotspots)) {
              setHotspots(newHotspots)
              if (import.meta.env.DEV) {
                console.log(`[useHotspots] Received ${newHotspots.length} hotspots via realtime`)
              }
              // Update SWR cache with fresh data
              mutate(newHotspots, false)
            }
          } catch (error) {
            console.error('[useHotspots] Error processing realtime update:', error)
          }
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.log(`[useHotspots] Realtime subscription status: ${status}`)
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [env.hotSpotHalos, mutate])

  return {
    hotspots: env.hotSpotHalos ? hotspots : [],
    loading: !data && !error && !!swrKey,
    error
  }
}