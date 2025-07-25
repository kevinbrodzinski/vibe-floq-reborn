import useSWR from 'swr'
import { supabase } from '@/integrations/supabase/client'

export interface TrendingVenue {
  id: string
  name: string
  address: string
  vibe: string
  live_count: number
  trending_score: number
  distance_m: number
  photo_url?: string
  is_trending: boolean
  recent_activity: string
}

const fetchTrendingVenues = async (lat: number, lng: number, radiusM: number = 1000): Promise<TrendingVenue[]> => {
  // For now, we'll simulate trending venues with mock data
  // TODO: Replace with actual venues_near_me query when table is created
  const venues = Array.from({ length: 10 }, (_, index) => ({
    id: `venue-${index}`,
    name: `Trending Venue ${index + 1}`,
    address: `${100 + index} Main St`,
    vibe: ['social', 'hype', 'chill', 'open'][index % 4],
    live_count: Math.floor(Math.random() * 50) + 5,
    distance_m: Math.floor(Math.random() * 500) + 100,
    photo_url: null
  }));

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Enhance with trending data
  return (venues || []).map((venue, index) => ({
    id: venue.id,
    name: venue.name,
    address: venue.address || 'Unknown address',
    vibe: venue.vibe || 'social',
    live_count: venue.live_count || Math.floor(Math.random() * 50) + 5,
    trending_score: Math.floor(Math.random() * 30) + 70, // 70-100
    distance_m: venue.distance_m || Math.floor(Math.random() * 500) + 100,
    photo_url: venue.photo_url,
    is_trending: index < 3, // Top 3 are trending
    recent_activity: ['2 min ago', '5 min ago', '10 min ago'][index % 3] || '15 min ago'
  }))
}

export const useTrendingVenues = (lat: number, lng: number, radiusM: number = 1000) => {
  const { data, error, mutate } = useSWR(
    lat && lng ? `trending-venues-${lat}-${lng}-${radiusM}` : null,
    () => fetchTrendingVenues(lat, lng, radiusM),
    {
      refreshInterval: 15000, // Refresh every 15 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  )

  return {
    venues: data || [],
    loading: !data && !error,
    error,
    refetch: mutate
  }
} 