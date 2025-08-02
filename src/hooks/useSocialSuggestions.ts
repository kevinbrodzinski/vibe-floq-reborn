import useSWR from 'swr'
import { supabase } from '@/integrations/supabase/client'
import { useNearbyPeople, type NearbyRow } from './useNearbyPeople'
import { useMemo } from 'react'

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

// Convert nearby people to social suggestion format
const convertNearbyToSuggestions = (nearbyPeople: NearbyRow[]): SocialSuggestion[] => {
  return nearbyPeople.map(person => ({
    friend_id: person.profile_id,
    display_name: `User ${person.profile_id.slice(-4)}`,
    avatar_url: null,
    vibe_tag: person.vibe,
    vibe_match: 85, // Default match score for nearby people
    distance_m: person.meters,
    last_activity: 'just now'
  }))
}

export const useSocialSuggestions = (lat?: number, lng?: number, radiusKm: number = 1) => {
  // Get nearby people from the optimized endpoint
  const { people: nearbyPeople, loading: nearbyLoading } = useNearbyPeople(lat, lng, 12)
  
  // Get friend suggestions from the existing endpoint
  const { data: friendSuggestions, error, mutate } = useSWR(
    lat && lng ? `social-suggestions-${lat}-${lng}-${radiusKm}` : null,
    lat && lng ? () => fetchSocialSuggestions(lat, lng, radiusKm) : null,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  )

  // Combine and deduplicate suggestions
  const combinedSuggestions = useMemo(() => {
    const nearbyAsSuggestions = convertNearbyToSuggestions(nearbyPeople)
    const friends = friendSuggestions || []
    
    // Create a map to deduplicate by friend_id
    const suggestionMap = new Map<string, SocialSuggestion>()
    
    // Add nearby people first (lower priority)
    nearbyAsSuggestions.forEach(suggestion => {
      suggestionMap.set(suggestion.friend_id, suggestion)
    })
    
    // Add friend suggestions (higher priority, will overwrite nearby)
    friends.forEach(suggestion => {
      suggestionMap.set(suggestion.friend_id, suggestion)
    })
    
    return Array.from(suggestionMap.values())
      .sort((a, b) => a.distance_m - b.distance_m) // Sort by distance
  }, [nearbyPeople, friendSuggestions])

  return {
    suggestions: combinedSuggestions,
    loading: nearbyLoading || (!friendSuggestions && !error),
    error,
    refetch: mutate
  }
}