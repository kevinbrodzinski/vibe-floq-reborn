import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { QK } from '@/constants/queryKeys'

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
    queryKey: QK.VenueInsights(),
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Fetch popular venues - try with popularity, fallback to basic list
      let popularVenues: PopularVenue[] = []
      
      try {
        const { data: venuesWithPop, error: popError } = await supabase
          .from('venues')
          .select('id, name, popularity')
          .order('popularity', { ascending: false })
          .limit(10)

        if (!popError && venuesWithPop) {
          // Guard against null popularity values
          popularVenues = venuesWithPop.map((v: any) => ({ 
            id: v.id,
            name: v.name,
            popularity: v.popularity ?? 0 
          }))
        } else {
          throw popError || new Error('No venues found')
        }
      } catch (venueError) {
        console.warn('Popular venues query failed, using fallback:', venueError)
        // Fallback to basic venue list
        const { data: fallbackVenues } = await supabase
          .from('venues')
          .select('id, name')
          .limit(10)
        
        popularVenues = fallbackVenues?.map(v => ({ 
          id: v.id,
          name: v.name,
          popularity: 0 
        })) || []
      }

      // TODO: Replace with v_time_in_venue_daily when materialized view is in types
      // For now, use venue_visits as fallback with 30 min estimate per visit
      const { data: visits, error: visitsError } = await supabase
        .from('venue_visits')
        .select('arrived_at')
        .eq('profile_id', user.id)
        .gte('arrived_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('arrived_at', { ascending: true })

      if (visitsError) {
        console.warn('Time data query failed:', visitsError)
        return { popularVenues, timeData: [] }
      }

      // Group by day and estimate time (simplified version)
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