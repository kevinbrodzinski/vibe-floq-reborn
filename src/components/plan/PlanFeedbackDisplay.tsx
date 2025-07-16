import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users, Heart, TrendingUp, Meh, Frown } from 'lucide-react';
import { usePlanFeedback } from '@/hooks/usePlanFeedback';
import { Skeleton } from '@/components/ui/skeleton';

interface PlanFeedbackDisplayProps {
  planId: string;
  className?: string;
}

export function PlanFeedbackDisplay({ planId, className = '' }: PlanFeedbackDisplayProps) {
  const { data: feedback, isLoading } = usePlanFeedback(planId);

  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded-xl animate-fade-in" />;
  }

  if (!feedback || feedback.length === 0) {
    return null;
  }

  const avgRating = feedback
    .filter(f => f.vibe_rating)
    .reduce((sum, f) => sum + (f.vibe_rating || 0), 0) / feedback.filter(f => f.vibe_rating).length;

  const wouldRepeatCount = feedback.filter(f => f.would_repeat).length;
  const favoriteMoments = feedback
    .filter(f => f.favorite_moment?.trim())
    .map(f => f.favorite_moment!.replace(/['"]/g, '\\"')); // Escape quotes for safety

  // Sentiment-based styling
  const getSentimentColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600 bg-green-50';
    if (rating >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSentimentIcon = (rating: number) => {
    if (rating >= 4) return TrendingUp;
    if (rating >= 3) return Meh;
    return Frown;
  };

  const SentimentIcon = !isNaN(avgRating) ? getSentimentIcon(avgRating) : Users;

  return (
    <Card className={`${className} animate-fade-in`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <SentimentIcon className={`w-4 h-4 ${!isNaN(avgRating) ? getSentimentColor(avgRating).split(' ')[0] : 'text-muted-foreground'}`} />
          <span className="text-sm font-medium">Group Feedback</span>
          <Badge variant="secondary" className="text-xs">
            {feedback.length} response{feedback.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Average Rating */}
        {!isNaN(avgRating) && (
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(avgRating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {avgRating.toFixed(1)} average vibe
            </span>
          </div>
        )}

        {/* Would Repeat */}
        {wouldRepeatCount > 0 && (
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" />
            <span className="text-sm">
              {wouldRepeatCount} of {feedback.length} would do this again
            </span>
          </div>
        )}

        {/* Favorite Moments */}
        {favoriteMoments.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Favorite Moments
            </span>
            <div className="space-y-2 animate-fade-in">
              {favoriteMoments.slice(0, 3).map((moment, index) => (
                <p 
                  key={index} 
                  className="text-sm text-muted-foreground italic leading-relaxed animate-scale-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                  aria-live="polite"
                >
                  &ldquo;{moment}&rdquo;
                </p>
              ))}
              {favoriteMoments.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{favoriteMoments.length - 3} more moments shared
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}