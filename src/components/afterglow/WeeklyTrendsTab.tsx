import { useWeeklyTrends, useDailyTrends } from '@/hooks/useWeeklyTrends';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function WeeklyTrendsTab() {
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklyTrends();
  const { data: dailyData, isLoading: dailyLoading } = useDailyTrends();

  if (weeklyLoading || dailyLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin" />
        <span className="ml-2">Loading trends...</span>
      </div>
    );
  }

  if (!weeklyData?.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No trend data available yet.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Keep using the app to build your trend insights!
        </p>
      </div>
    );
  }

  const latestWeek = weeklyData[weeklyData.length - 1];
  const recentDaily = dailyData?.slice(-7) || [];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSuggestion = () => {
    if (latestWeek.energy_trend === 'declining') {
      return "Your energy has been dipping. Try planning some high-energy activities!";
    }
    if (latestWeek.social_trend === 'declining') {
      return "Social activity is down. Consider reaching out to friends or joining a floq!";
    }
    if (latestWeek.energy_trend === 'improving' && latestWeek.social_trend === 'improving') {
      return "You're on a great streak! Keep up the momentum!";
    }
    return "Your patterns look stable. Keep exploring new experiences!";
  };

  return (
    <div className="space-y-6">
      {/* Quick numbers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-card rounded-lg border">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl font-bold">{Math.round(latestWeek.avg_energy)}</span>
            {getTrendIcon(latestWeek.energy_trend)}
          </div>
          <div className="text-sm text-muted-foreground">Average Energy</div>
          <Badge variant="outline" className="mt-1 text-xs">
            {latestWeek.energy_trend}
          </Badge>
        </div>
        
        <div className="text-center p-4 bg-card rounded-lg border">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl font-bold">{Math.round(latestWeek.avg_social)}</span>
            {getTrendIcon(latestWeek.social_trend)}
          </div>
          <div className="text-sm text-muted-foreground">Average Social</div>
          <Badge variant="outline" className="mt-1 text-xs">
            {latestWeek.social_trend}
          </Badge>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h4 className="font-medium mb-3">Last 7 Days</h4>
        <div className="space-y-2">
          {recentDaily.map((day, index) => (
            <div key={day.date} className="flex items-center justify-between p-2 rounded border">
              <span className="text-sm">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  E: {day.energy_score}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  S: {day.social_intensity}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggestion */}
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
        <h4 className="font-medium text-primary mb-2">💡 Insight</h4>
        <p className="text-sm text-muted-foreground">
          {getSuggestion()}
        </p>
      </div>
    </div>
  );
}