import { useQuery } from '@tanstack/react-query';
import {
  fetchWeeklyTrends,
  fetchDailyTrends,
  WeeklyTrend,
  DailyTrend,
} from '@/lib/afterglow-trends';

export const useWeeklyTrends = () =>
  useQuery<WeeklyTrend[], Error>({
    queryKey: ['afterglow', 'weekly-trends'],
    queryFn: () => fetchWeeklyTrends(),
    staleTime: 60 * 60 * 1000, // 1 h
  });

export const useDailyTrends = () =>
  useQuery<DailyTrend[], Error>({
    queryKey: ['afterglow', 'daily-trends'],
    queryFn: () => fetchDailyTrends(),
    staleTime: 30 * 60 * 1000, // 30 min
  });