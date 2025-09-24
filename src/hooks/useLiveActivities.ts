import useSWR from 'swr'
import { supabase } from '@/integrations/supabase/client'

export interface LiveActivity {
  id: string
  type: 'checkin' | 'venue_activity' | 'friend_joined' | 'trending'
  user_name?: string
  venue_name: string
  activity_text: string
  timestamp: string
  avatar_url?: string
  vibe?: string
}

const fetchLiveActivities = async (lat: number, lng: number, radiusM: number = 1000): Promise<LiveActivity[]> => {
  // For now, we'll simulate live activities
  // In production, this would call a Supabase edge function or real-time subscription
  
  const mockActivities: LiveActivity[] = [
    {
      id: '1',
      type: 'checkin',
      user_name: 'Sarah',
      venue_name: 'Venice Beach Boardwalk',
      activity_text: 'Sarah just checked in at Venice Beach Boardwalk',
      timestamp: '2 min ago',
      avatar_url: undefined,
      vibe: 'social'
    },
    {
      id: '2',
      type: 'venue_activity',
      venue_name: 'The Coffee Bean',
      activity_text: '5 new people joined the vibe at The Coffee Bean',
      timestamp: '5 min ago',
      vibe: 'chill'
    },
    {
      id: '3',
      type: 'friend_joined',
      user_name: 'Mike',
      venue_name: 'Santa Monica Pier',
      activity_text: 'Mike joined a floq at Santa Monica Pier',
      timestamp: '8 min ago',
      vibe: 'hype'
    },
    {
      id: '4',
      type: 'trending',
      venue_name: 'Abbot Kinney Blvd',
      activity_text: 'Abbot Kinney Blvd is trending with 23 people',
      timestamp: '12 min ago',
      vibe: 'social'
    },
    {
      id: '5',
      type: 'checkin',
      user_name: 'Emma',
      venue_name: 'Rose Cafe',
      activity_text: 'Emma just checked in at Rose Cafe',
      timestamp: '15 min ago',
      vibe: 'chill'
    }
  ]

  return mockActivities
}

export const useLiveActivities = (lat: number, lng: number, radiusM: number = 1000) => {
  const { data, error, mutate } = useSWR(
    lat && lng ? `live-activities-${lat}-${lng}-${radiusM}` : null,
    () => fetchLiveActivities(lat, lng, radiusM),
    {
      refreshInterval: 10000, // Refresh every 10 seconds for real-time feel
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  )

  return {
    activities: data || [],
    loading: !data && !error,
    error,
    refetch: mutate
  }
} 