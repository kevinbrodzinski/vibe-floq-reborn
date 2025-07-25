import useSWR from 'swr'
import { supabase } from '@/integrations/supabase/client'

export interface SocialSuggestion {
  friend_id: string
  display_name: string
  avatar_url: string | null
  vibe_tag: string
  vibe_match: number
  distance_m: number
  last_activity: string
}

const fetchSocialSuggestions = async (radiusM: number): Promise<SocialSuggestion[]> => {
  const { data, error } = await supabase.functions.invoke('get-social-suggestions', {
    body: { radiusM }
  })

  if (error) throw error
  return data as SocialSuggestion[]
}

export const useSocialSuggestions = (radiusM: number = 1000) => {
  const { data, error, mutate } = useSWR(
    `social-suggestions-${radiusM}`,
    () => fetchSocialSuggestions(radiusM),
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