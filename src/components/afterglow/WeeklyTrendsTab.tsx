import { useWeeklyTrends, useDailyTrends } from '@/hooks/useWeeklyTrends';
import { Loader2, TrendingUp, TrendingDown, Minus, RefreshCw, Zap, Crown, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWeeklySuggestion } from '@/hooks/useWeeklySuggestion';
import { useUser } from '@supabase/auth-helpers-react';
import { TrendMiniChart } from '@/components/charts/TrendMiniChart';
import { useStreakDetection } from '@/hooks/useStreakDetection';

export default function WeeklyTrendsTab() {
  const user = useUser();
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklyTrends();
  const { data: dailyData, isLoading: dailyLoading } = useDailyTrends();
  const { data: aiSuggestion, isLoading: suggestionLoading, regenerate, isRegenerating, cooldown, isCooldownLoading } = useWeeklySuggestion(user?.id);
  const streakData = useStreakDetection();

  // Prepare chart data from recent daily trends
  const chartData = dailyData?.slice(-7).map(day => ({
    day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
    energy: day.energy_score,
    social: day.social_intensity
  })) || [];

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
      <div className="text-center py-12 animate-fade-in">
        <div className="animate-pulse mb-4">
          <Zap className="w-12 h-12 mx-auto text-primary/60" />
        </div>
        <h3 className="text-lg font-medium mb-2">Build Your Vibe Journey</h3>
        <p className="text-muted-foreground mb-1">No trend data available yet.</p>
        <p className="text-sm text-muted-foreground">
          Keep vibing to unlock personalized insights! ✨
        </p>
        <div className="mt-6 max-w-sm mx-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-xs text-muted-foreground">0/7 days</span>
          </div>
          <div className="w-full bg-muted h-2 rounded-full">
            <div className="h-2 rounded-full bg-gradient-to-r from-primary/50 to-primary animate-pulse w-0"></div>
          </div>
        </div>
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
      {/* Streak indicator (if applicable) */}
      {streakData.hasVisualStreak && (
        <div className="p-4 bg-gradient-to-r from-orange-50/60 to-amber-50/60 dark:from-orange-950/20 dark:to-amber-950/20 rounded-lg border-2 border-orange-200 dark:border-orange-800 shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-amber-600 animate-pulse" />
            <span className="font-medium text-amber-800 dark:text-amber-200">
              On Fire! 🔥
            </span>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {streakData.bothStreak} weeks of improving both energy and social trends! Keep it up!
          </p>
        </div>
      )}

      {/* Quick numbers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-card rounded-lg border">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl font-bold">{Math.round(latestWeek.avg_energy)}</span>
            {getTrendIcon(latestWeek.energy_trend)}
            {streakData.energyStreak > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">
                {streakData.energyStreak}w
              </Badge>
            )}
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
            {streakData.socialStreak > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">
                {streakData.socialStreak}w
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">Average Social</div>
          <Badge variant="outline" className="mt-1 text-xs">
            {latestWeek.social_trend}
          </Badge>
        </div>
      </div>

      {/* 7-Day Trend Chart */}
      {chartData.length > 0 && (
        <div className="p-4 bg-card rounded-lg border">
          <h4 className="font-medium mb-3">7-Day Trend</h4>
          <TrendMiniChart data={chartData} width="100%" height={140} />
        </div>
      )}

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

      {/* AI Suggestions */}
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-primary">🤖 AI Coach</h4>
          <div className="flex items-center gap-2">
            {cooldown && !cooldown.canRegenerate && (
              <span className="text-xs text-muted-foreground">
                {cooldown.hoursLeft}h left
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => regenerate()}
              disabled={
                isRegenerating || 
                suggestionLoading || 
                isCooldownLoading || 
                (cooldown && !cooldown.canRegenerate)
              }
              className="flex items-center gap-2 text-xs"
              title={
                cooldown && !cooldown.canRegenerate 
                  ? `Wait ${cooldown.hoursLeft}h before regenerating`
                  : undefined
              }
            >
              {cooldown && !cooldown.canRegenerate ? (
                <Clock className="h-3 w-3 text-amber-500" />
              ) : (
                <RefreshCw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
              )}
              Regenerate
              {cooldown && !cooldown.canRegenerate && (
                <span className="ml-1 inline-flex items-center gap-1 text-amber-500">
                  {cooldown.hoursLeft}h
                </span>
              )}
            </Button>
          </div>
        </div>
        
        {suggestionLoading || isRegenerating ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2 animate-fade-in" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating personalized suggestions...
          </div>
        ) : aiSuggestion?.suggestion?.text ? (
          <div className="space-y-2 animate-fade-in" aria-live="polite">
            <div className="text-sm whitespace-pre-line">
              {aiSuggestion.suggestion.text}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span>Based on Energy: {aiSuggestion.suggestion.energy_score}% • Social: {aiSuggestion.suggestion.social_score}%</span>
              {aiSuggestion.source === 'cache' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                  Cached
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <p className="text-sm text-muted-foreground">
              {getSuggestion()}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Get personalized AI insights by clicking Regenerate above! ✨
            </p>
          </div>
        )}
      </div>
    </div>
  );
}