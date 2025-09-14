import { TrendingUp, Users, Zap, Calendar, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CountUp } from '@/components/ui/count-up';
import { useProfileStats } from '@/hooks/useProfileStats';
import { vibeToHex } from '@/lib/vibe/color';
import { safeVibe } from '@/lib/vibes';
import { LeaderboardMini } from '@/components/LeaderboardMini';

export function ProfileStats() {
  const { data: stats, isLoading } = useProfileStats();

  // Define stats configuration with server-side data
  const statsConfig = [
    {
      label: 'Crossed Paths',
      value: stats?.crossings_7d || 0,
      subtext: 'last 7 days',
      icon: TrendingUp,
      color: 'text-primary',
      isNumeric: true
    },
    {
      label: 'Friends',
      value: stats?.friend_count || 0,
      subtext: 'connections',
      icon: Users,
      color: 'text-secondary',
      isNumeric: true
    },
    {
      label: 'Most Active Vibe',
      value: stats?.most_active_vibe || 'unknown',
      subtext: 'this week',
      icon: Zap,
      color: vibeToHex(safeVibe(stats?.most_active_vibe || 'social')),
      isNumeric: false
    },
    {
      label: 'Days Active',
      value: stats?.days_active_this_month || 0,
      subtext: 'this month',
      icon: Calendar,
      color: 'text-muted-foreground',
      isNumeric: true
    },
    {
      label: 'Achievements',
      value: stats?.total_achievements || 0,
      subtext: 'earned',
      icon: Trophy,
      color: 'text-accent',
      isNumeric: true
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-4 bg-card/50 backdrop-blur-sm border-border/30">
            <div className="animate-pulse">
              <div className="h-3 bg-muted rounded w-16 mb-2"></div>
              <div className="h-6 bg-muted rounded w-8 mb-1"></div>
              <div className="h-3 bg-muted rounded w-12"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {statsConfig.slice(0, 4).map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index} className="p-4 bg-card/50 backdrop-blur-sm border-border/30">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {stat.isNumeric ? (
                      <CountUp end={stat.value as number} duration={800} />
                    ) : (
                      <span className="capitalize">{stat.value}</span>
                    )}
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
      
      {/* Leaderboard Section */}
      <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/30">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Leaderboard Position
            </p>
            <p className="text-sm text-muted-foreground">
              Achievement ranking
            </p>
          </div>
          <LeaderboardMini />
        </div>
      </Card>
    </div>
  );
}