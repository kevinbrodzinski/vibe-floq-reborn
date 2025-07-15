import useSWR from 'swr'
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useCurrentVibe } from '@/lib/store/useVibe'
import { useUserLocation } from '@/hooks/useUserLocation'
import { getEnvironmentConfig } from '@/lib/environment'

export interface SocialSuggestion {
  friend_id: string
  display_name: string
  avatar_url: string | null
  vibe_tag: string
  vibe_match: number
  distance_m: number
  started_at: string
}

const fetchSuggestions = async (radius: number = 1000): Promise<SocialSuggestion[]> => {
  const { data, error } = await supabase.functions.invoke('get-social-suggestions', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: { radius }
  })

  if (error) throw error
  return data as SocialSuggestion[]
}

export const useSocialSuggestions = (radius: number = 1000) => {
  const env = getEnvironmentConfig()
  const { location, loading: locLoading } = useUserLocation()
  const currentVibe = useCurrentVibe()

  const key = !env.smartSocialSuggestions || locLoading || !currentVibe || !location?.coords
    ? null
    : `social:${currentVibe}:${radius}:${location.coords.latitude.toFixed(3)},${location.coords.longitude.toFixed(3)}`

  const { data, error, mutate } = useSWR(key, () => fetchSuggestions(radius), {
    refreshInterval: 30000,
    dedupingInterval: 15000,
  })

  // realtime channel for social suggestions updates
  useEffect(() => {
    if (!key) return
    
    const channel = supabase.channel('social-suggestions')
      .on('broadcast', { event: 'social_suggestions_updated' }, () => {
        mutate()
      })
      .subscribe()

    return () => { 
      supabase.removeChannel(channel) 
    }
  }, [key, mutate])

  return {
    suggestions: data ?? [],
    loading: !data && !error,
    error,
    mutate,
  }
}