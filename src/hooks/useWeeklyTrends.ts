import { useQuery } from '@tanstack/react-query';
import { fetchWeeklyTrends, fetchDailyTrends } from '@/lib/afterglow-trends';

export function useWeeklyTrends(weeksBack = 8) {
  return useQuery({
    queryKey: ['weekly-trends', weeksBack],
    queryFn: () => fetchWeeklyTrends(weeksBack),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useDailyTrends() {
  return useQuery({
    queryKey: ['daily-trends'],
    queryFn: () => fetchDailyTrends(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}