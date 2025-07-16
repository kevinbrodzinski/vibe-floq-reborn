import { supabase } from '@/integrations/supabase/client';

/* ────────────────────────────── Types ───────────────────────────── */
export interface WeeklyTrend {
  week_start: string;          // YYYY-MM-DD
  avg_energy: number;
  avg_social: number;
  day_count: number;
  energy_trend: 'improving' | 'declining' | 'stable';
  social_trend: 'improving' | 'declining' | 'stable';
}

export interface DailyTrend {
  date: string;                // YYYY-MM-DD
  energy_score: number;
  social_intensity: number;
  total_moments: number;
  rolling_energy_7d: number;
  rolling_social_7d: number;
}

/* ─────────────────────── RPC wrappers (type-safe) ───────────────── */
export async function fetchWeeklyTrends(
  weeksBack = 8
): Promise<WeeklyTrend[]> {
  const { data, error } = await supabase.rpc(
    'get_afterglow_weekly_trends',
    { /* no params (auth.uid() inside)*/ }
  );
  if (error) throw error;
  return (data ?? []) as WeeklyTrend[];
}

export async function fetchDailyTrends(): Promise<DailyTrend[]> {
  const { data, error } = await supabase.rpc(
    'get_afterglow_daily_trends',
    { /* auth.uid() inside */ }
  );
  if (error) throw error;
  return (data ?? []) as DailyTrend[];
}