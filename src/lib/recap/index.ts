import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import dayjs from '@/lib/dayjs'
import { useAuth } from '@/hooks/useAuth'

export const QK = {
  Recap: (profileId: string, date: string) => ['daily-recap', profileId, date] as const,
}

const RECAP_CACHE_KEY = (profileId: string, date: string) => `recap_${profileId}_${date}`

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
  const { user } = useAuth();
  const tzNow = dayjs().utc();                     // <─ UTC safe
  const yesterday = tzNow.subtract(1, 'day')
    .format('YYYY-MM-DD');

  return useQuery({
    queryKey: QK.Recap(user?.id ?? 'anonymous', yesterday),
    enabled: Boolean(user),

    queryFn: async () => {
      if (!user) return null;

      const cacheKey = RECAP_CACHE_KEY(user.id, yesterday);

      try {
        // Completely bypass TypeScript inference to avoid depth issues
        const client: any = supabase;
        const result = await client
          .from('daily_recap_cache')
          .select('payload')
          .eq('user_id', user.id)
          .eq('day', yesterday)
          .maybeSingle();
        
        if (result.error) {
          console.error('[Recap]', result.error);
          return null;
        }

        const recapData = result.data?.payload || null;

        if (recapData) {
          localStorage.setItem(cacheKey, JSON.stringify(recapData));
        }
        return recapData;
      } catch (error) {
        console.error('[Recap] Query failed:', error);
        return null;
      }
    },

    initialData: () => {
      if (!user) return null;
      try {
        const cached = localStorage.getItem(
          RECAP_CACHE_KEY(user.id, yesterday)
        );
        return cached ? JSON.parse(cached) : null;
      } catch { return null; }
    },

    staleTime: 30 * 60_000,
    retry: 1,
  });
};

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