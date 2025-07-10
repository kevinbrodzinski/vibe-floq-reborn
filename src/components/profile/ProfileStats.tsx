import { TrendingUp, Users, Zap, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useCrossedPathsToday } from '@/hooks/useCrossedPathsToday';
import { useFriends } from '@/hooks/useFriends';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export function ProfileStats() {
  const { count: crossedPathsCount } = useCrossedPathsToday();
  const { friendCount } = useFriends();
  const { user } = useAuth();

  // Get user's vibe activity stats
  const { data: vibeStats } = useQuery({
    queryKey: ['vibe-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get most frequent vibe this week
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      
      const { data: vibeData } = await supabase
        .from('vibes_log')
        .select('vibe')
        .eq('user_id', user.id)
        .gte('ts', weekStart.toISOString());

      // Get days active this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: activityData } = await supabase
        .from('vibes_log')
        .select('ts')
        .eq('user_id', user.id)
        .gte('ts', monthStart.toISOString());

      // Calculate most frequent vibe
      const vibeCounts = (vibeData || []).reduce((acc, { vibe }) => {
        acc[vibe] = (acc[vibe] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostFrequentVibe = Object.entries(vibeCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'social';

      // Calculate unique days active
      const uniqueDays = new Set(
        (activityData || []).map(({ ts }) => 
          new Date(ts).toDateString()
        )
      ).size;

      return {
        mostFrequentVibe,
        daysActiveThisMonth: uniqueDays,
        totalVibeChanges: vibeData?.length || 0
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const stats = [
    {
      label: 'Crossed Paths',
      value: crossedPathsCount,
      subtext: 'today',
      icon: TrendingUp,
      color: 'text-primary'
    },
    {
      label: 'Friends',
      value: friendCount,
      subtext: 'connections',
      icon: Users,
      color: 'text-secondary'
    },
    {
      label: 'Most Active Vibe',
      value: vibeStats?.mostFrequentVibe || 'social',
      subtext: 'this week',
      icon: Zap,
      color: 'text-accent'
    },
    {
      label: 'Days Active',
      value: vibeStats?.daysActiveThisMonth || 0,
      subtext: 'this month',
      icon: Calendar,
      color: 'text-muted-foreground'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <Card key={index} className="p-4 bg-card/50 backdrop-blur-sm border-border/30">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {typeof stat.value === 'string' ? stat.value : stat.value}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stat.subtext}
                </p>
              </div>
              <IconComponent className={`h-4 w-4 ${stat.color}`} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}