import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import dayjs from 'dayjs'

export const QK = {
  Recap: (userId: string, date: string) => ['daily-recap', userId, date] as const,
}

const RECAP_CACHE_KEY = (userId: string, date: string) => `recap_${userId}_${date}`

export interface RecapData {
  day: string
  totalMins: number
  venues: number
  encounters: number
  longestStay: {
    mins: number
    venue?: string
  }
  timeline: Array<{
    hour: number
    mins: number
  }>
  topVenues: Array<{
    id: string
    name: string
    mins: number
    popularity: number
  }> | null
}

export const useTodayRecap = () => {
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  
  return useQuery({
    queryKey: QK.Recap('user', yesterday), // Will be updated with actual userId below
    queryFn: async (): Promise<RecapData | null> => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      // Handle auth errors gracefully - return null instead of throwing
      if (authError || !user) {
        console.log('No authenticated user for recap')
        return null
      }

      const cacheKey = RECAP_CACHE_KEY(user.id, yesterday)

      try {
        const { data, error } = await supabase
          .from('daily_recap_cache')
          .select('payload')
          .eq('user_id', user.id)
          .eq('day', yesterday)
          .maybeSingle()

        if (error) {
          console.error('Error fetching recap:', error)
          return null
        }

        const recapData = (data?.payload as unknown) as RecapData | null
        
        // Cache successful result
        if (recapData) {
          localStorage.setItem(cacheKey, JSON.stringify(recapData))
        }
        
        return recapData
      } catch (error) {
        console.error('Recap query failed:', error)
        return null
      }
    },
    initialData: () => {
      // Try to get cached data from localStorage
      try {
        // Don't call async getUser here, use synchronous method
        const cached = localStorage.getItem(`recap_user_${yesterday}`)
        return cached ? JSON.parse(cached) : undefined
      } catch {
        // Ignore localStorage errors
      }
      return undefined
    },
    staleTime: 30 * 60 * 1000, // 30 min
    retry: 1, // Reduce retries since auth errors shouldn't retry
  })
}

// Helper to check if it's past 5 AM local time
export const isPast5AM = () => {
  const now = dayjs()
  const fiveAM = now.hour(5).minute(0).second(0)
  return now.isAfter(fiveAM)
}

// Helper to check if recap should be shown
export const shouldShowRecap = (data: RecapData | null) => {
  if (!data || !isPast5AM()) return false
  
  // Show if user had some activity (visited venues or had encounters)
  return data.venues > 0 || data.encounters > 0 || data.totalMins > 0
}