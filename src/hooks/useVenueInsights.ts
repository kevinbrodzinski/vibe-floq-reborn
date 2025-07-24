import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export const useVenueInsights = () => {
  return useQuery({
    queryKey: ['venue-insights'],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Fetch popular venues
      const { data: popularVenues, error: venueError } = await supabase
        .from('venues')
        .select('id, name, popularity')
        .order('popularity', { ascending: false })
        .limit(10)

      if (venueError) throw venueError

      // Fetch user's time-in-venue data
      const { data: timeData, error: timeError } = await supabase
        .from('v_time_in_venue_daily')
        .select('*')
        .eq('user_id', user.id)
        .order('day', { ascending: true })

      if (timeError) throw timeError

      return {
        popularVenues: popularVenues || [],
        timeData: timeData || []
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}