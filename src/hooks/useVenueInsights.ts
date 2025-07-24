import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface PopularVenue {
  id: string
  name: string
  popularity: number
}

interface TimeData {
  day: string
  minutes_spent: number
}

export const useVenueInsights = () => {
  return useQuery({
    queryKey: ['venue-insights'],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Fetch popular venues - use basic venues for now since popularity column might not be in types
      const { data: venues, error: venueError } = await supabase
        .from('venues')
        .select('id, name')
        .limit(10)

      if (venueError) throw venueError

      // Transform to include popularity (will be 0 until types are updated)
      const popularVenues: PopularVenue[] = venues?.map(v => ({ ...v, popularity: 0 })) || []

      // For time data, use venue_visits as a fallback until materialized view is in types
      const { data: visits, error: visitsError } = await supabase
        .from('venue_visits')
        .select('arrived_at')
        .eq('user_id', user.id)
        .gte('arrived_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('arrived_at', { ascending: true })

      if (visitsError) throw visitsError

      // Group by day and count visits (simplified version)
      const timeData: TimeData[] = visits?.reduce((acc: TimeData[], visit) => {
        const day = new Date(visit.arrived_at).toISOString().split('T')[0]
        const existing = acc.find(item => item.day === day)
        if (existing) {
          existing.minutes_spent += 30 // Estimate 30 min per visit
        } else {
          acc.push({ day, minutes_spent: 30 })
        }
        return acc
      }, []) || []

      return {
        popularVenues,
        timeData
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}