import { useQuery } from '@tanstack/react-query';
import {
  fetchWeeklyTrends,
  fetchDailyTrends,
  WeeklyTrend,
  DailyTrend,
} from '@/lib/afterglow-trends';

export const useWeeklyTrends = (weeksBack = 8) =>
  useQuery<WeeklyTrend[], Error>({
    queryKey: ['afterglow', 'weekly-trends', weeksBack],
    queryFn: () => fetchWeeklyTrends(weeksBack),
    staleTime: 1000 * 60 * 60, // 1h
  });

export const useDailyTrends = () =>
  useQuery<DailyTrend[], Error>({
    queryKey: ['afterglow', 'daily-trends'],
    queryFn: () => fetchDailyTrends(),
    staleTime: 1000 * 60 * 30, // 30 min
  });