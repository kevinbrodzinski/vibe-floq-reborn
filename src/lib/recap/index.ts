import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import dayjs from 'dayjs'

export const QK = {
  Recap: (date: string) => ['daily-recap', date] as const,
}

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
  return useQuery({
    queryKey: QK.Recap(dayjs().subtract(1, 'day').format('YYYY-MM-DD')),
    queryFn: async (): Promise<RecapData | null> => {
      const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const { data, error } = await supabase
        .from('daily_recap_cache')
        .select('payload')
        .eq('user_id', user.id)
        .eq('day', yesterday)
        .maybeSingle()

      if (error) throw error
      return (data?.payload as unknown) as RecapData | null
    },
    staleTime: 30 * 60 * 1000, // 30 min
    retry: 2,
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