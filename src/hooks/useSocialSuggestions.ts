import useSWR from 'swr'
import { supabase } from '@/integrations/supabase/client'
import { useNearbyPeople } from './useNearbyPeople'
import { useMemo } from 'react'

export interface SocialSuggestion {
  friend_id: string
  display_name: string
  avatar_url: string | null
  vibe_tag: string
  vibe_match: number
  distance_m: number
  last_activity: string
}

export const useSocialSuggestions = (lat?: number, lng?: number) => {
  /* —— 1. Nearby people  —— */
  const { people, loading: nearLoad } = useNearbyPeople(lat, lng, 12)

  /* —— 2. Legacy friend suggestions  —— */
  const { data: friends = [], error, isLoading: friendLoad } = useSWR(
    lat && lng ? ['social-suggestions', lat, lng] : null,
    ([, lat, lng]) =>
      supabase.functions
        .invoke('get-social-suggestions', { body: { lat, lng, radiusKm: 1 } })
        .then(r => r.data)
  )

  /* —— 3.  Merge + prioritise —— */
  const suggestions = useMemo(() => {
    const map = new Map<string, SocialSuggestion>()
    people.forEach(p =>
      map.set(p.profile_id, {
        friend_id: p.profile_id,
        display_name: `User ${p.profile_id.slice(-4)}`,
        avatar_url: null,
        vibe_tag: p.vibe,
        distance_m: p.meters,
        vibe_match: 80,
        last_activity: 'moments ago'
      }))
    friends.forEach((f: SocialSuggestion) => map.set(f.friend_id, f)) // overrides duplicates
    return [...map.values()].sort((a, b) => a.distance_m - b.distance_m)
  }, [people, friends])

  return {
    suggestions,
    loading: nearLoad || friendLoad,
    error: error as Error | undefined,
    refetch: () => supabase.functions.invoke('get-social-suggestions')
  }
}