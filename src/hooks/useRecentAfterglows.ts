import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RecentAfterglowData {
  date: string;
  energy: number | null;
  has_data: boolean;
  total_venues?: number;
  total_floqs?: number;
  crossed_paths_count?: number;
}

export function useRecentAfterglows() {
  return useQuery({
    queryKey: ['recent-afterglows'],
    queryFn: async () => {
      // Query the last 30 days of afterglow data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: afterglowData, error: afterglowError } = await supabase
        .from('daily_afterglow')
        .select('date, energy_score, total_venues, total_floqs, crossed_paths_count')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0] as any)
        .order('date', { ascending: false })
        .returns<any>();
      
      if (afterglowError) throw afterglowError;
      
      // Generate the last 30 days with data availability
      const recentDates: RecentAfterglowData[] = [];
      const today = new Date();
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const afterglow = (afterglowData as any)?.find((d: any) => d.date === dateStr);
        
        recentDates.push({
          date: dateStr,
          energy: (afterglow as any)?.energy_score || null,
          has_data: !!afterglow,
          total_venues: (afterglow as any)?.total_venues || 0,
          total_floqs: (afterglow as any)?.total_floqs || 0,
          crossed_paths_count: (afterglow as any)?.crossed_paths_count || 0,
        });
      }
      
      // Calculate some stats for better UX
      const daysWithData = recentDates.filter(d => d.has_data);
      const averageEnergy = daysWithData.length > 0 
        ? daysWithData.reduce((sum, d) => sum + (d.energy || 0), 0) / daysWithData.length 
        : 0;
      
      return {
        hasDataDates: recentDates.filter(d => d.has_data).map(d => new Date(d.date)),
        recent: recentDates.slice(0, 7),
        all: recentDates,
        stats: {
          totalDays: recentDates.length,
          daysWithData: daysWithData.length,
          averageEnergy: Math.round(averageEnergy * 10) / 10,
          highestEnergy: Math.max(...daysWithData.map(d => d.energy || 0)),
          totalVenues: daysWithData.reduce((sum, d) => sum + (d.total_venues || 0), 0),
          totalFloqs: daysWithData.reduce((sum, d) => sum + (d.total_floqs || 0), 0),
          totalCrossedPaths: daysWithData.reduce((sum, d) => sum + (d.crossed_paths_count || 0), 0),
        }
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}