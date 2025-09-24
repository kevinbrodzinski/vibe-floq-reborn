
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Minus, Sparkles, Clock } from 'lucide-react';
import { useWeeklyTrends } from '@/hooks/useAfterglowTrends';
import { useWeeklySuggestion } from '@/hooks/useWeeklySuggestion';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function WeeklyTrendsTab() {
  const { data: trends, isLoading: trendsLoading, error: trendsError } = useWeeklyTrends();
  const { 
    data: suggestion, 
    isLoading: suggestionLoading, 
    error: suggestionError,
    regenerate, 
    isRegenerating, 
    cooldown, 
    isCooldownLoading,
    isAuthenticated 
  } = useWeeklySuggestion();

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600 bg-green-50';
      case 'declining': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>
            Please ensure you're logged in to view your weekly trends and AI suggestions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (trendsError) {
    console.error('[WeeklyTrends] Error:', trendsError);
  }

  if (suggestionError) {
    console.error('[WeeklySuggestion] Error:', suggestionError);
  }

  return (
    <div className="space-y-6">
      {/* Weekly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Weekly Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading your weekly trends...</p>
            </div>
          ) : trendsError ? (
            <Alert>
              <AlertDescription>
                Unable to load weekly trends. Please try again later.
              </AlertDescription>
            </Alert>
          ) : !trends || trends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No trend data available yet.</p>
              <p className="text-sm">Complete a few more afterglows to see trends!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trends.slice(0, 4).map((week) => (
                <div key={week.week_start} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">
                      Week of {new Date(week.week_start).toLocaleDateString()}
                    </h4>
                    <span className="text-sm text-muted-foreground">
                      {week.day_count} day{week.day_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getTrendIcon(week.energy_trend)}
                        <span className="text-sm font-medium">Energy</span>
                      </div>
                      <div className={`inline-flex px-2 py-1 rounded-full text-xs ${getTrendColor(week.energy_trend)}`}>
                        {week.avg_energy}/100 avg
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getTrendIcon(week.social_trend)}
                        <span className="text-sm font-medium">Social</span>
                      </div>
                      <div className={`inline-flex px-2 py-1 rounded-full text-xs ${getTrendColor(week.social_trend)}`}>
                        {week.avg_social}/100 avg
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Weekly Suggestion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Weekly Coaching
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suggestionLoading || isCooldownLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading your personalized suggestions...</p>
            </div>
          ) : suggestionError ? (
            <Alert>
              <AlertDescription>
                Unable to load AI suggestions. {suggestionError?.message || 'Please try again later.'}
              </AlertDescription>
            </Alert>
          ) : suggestion?.suggestions ? (
            <div className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground mb-4">
                  Based on your recent afterglow patterns, here are personalized insights:
                </p>
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="whitespace-pre-wrap">{suggestion.suggestions}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-xs text-muted-foreground">
                  Generated {new Date(suggestion.generated_at).toLocaleDateString()}
                </span>
                
                <Button
                  onClick={() => regenerate()}
                  disabled={isRegenerating || !cooldown?.canRegenerate}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {isRegenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isRegenerating ? 'Generating...' : 'Regenerate'}
                </Button>
              </div>
              
              {cooldown && !cooldown.canRegenerate && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Can regenerate in {cooldown.hoursLeft}h
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No AI suggestions available yet.</p>
              <p className="text-sm">Complete more afterglows to get personalized coaching!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
