import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RecentAfterglowData {
  date: string;
  energy: number | null;
  has_data: boolean;
}

export function useRecentAfterglows() {
  return useQuery({
    queryKey: ['recent-afterglows'],
    queryFn: async () => {
      // Query the last 30 days of afterglow data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('daily_afterglow')
        .select('date, energy_score')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Generate the last 30 days with data availability
      const recentDates: RecentAfterglowData[] = [];
      const today = new Date();
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const afterglowData = data?.find(d => d.date === dateStr);
        
        recentDates.push({
          date: dateStr,
          energy: afterglowData?.energy_score || null,
          has_data: !!afterglowData
        });
      }
      
      return {
        hasDataDates: recentDates.filter(d => d.has_data).map(d => new Date(d.date)),
        recent: recentDates.slice(0, 7),
      };
    },
  });
}