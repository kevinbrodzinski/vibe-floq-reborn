import useSWR from 'swr'
import { supabase } from '@/integrations/supabase/client'

export interface SocialSuggestion {
  friend_id: string // Keep as friend_id since this comes from unified view
  display_name: string
  avatar_url: string | null
  vibe_tag: string
  vibe_match: number
  distance_m: number
  last_activity: string
}

const fetchSocialSuggestions = async (lat: number, lng: number, radiusKm: number = 1): Promise<SocialSuggestion[]> => {
  const { data, error } = await supabase.functions.invoke('get-social-suggestions', {
    body: { lat, lng, radiusKm }
  })

  if (error) throw error
  return data as SocialSuggestion[]
}

export const useSocialSuggestions = (lat?: number, lng?: number, radiusKm: number = 1) => {
  const { data, error, mutate } = useSWR(
    lat && lng ? `social-suggestions-${lat}-${lng}-${radiusKm}` : null,
    lat && lng ? () => fetchSocialSuggestions(lat, lng, radiusKm) : null,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  )

  return {
    suggestions: data || [],
    loading: !data && !error,
    error,
    refetch: mutate
  }
}