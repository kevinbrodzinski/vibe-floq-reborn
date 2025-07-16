import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users, Heart } from 'lucide-react';
import { usePlanFeedback } from '@/hooks/usePlanFeedback';
import { Skeleton } from '@/components/ui/skeleton';

interface PlanFeedbackDisplayProps {
  planId: string;
  className?: string;
}

export function PlanFeedbackDisplay({ planId, className = '' }: PlanFeedbackDisplayProps) {
  const { data: feedback, isLoading } = usePlanFeedback(planId);

  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded-xl" />;
  }

  if (!feedback || feedback.length === 0) {
    return null;
  }

  const avgRating = feedback
    .filter(f => f.vibe_rating)
    .reduce((sum, f) => sum + (f.vibe_rating || 0), 0) / feedback.filter(f => f.vibe_rating).length;

  const wouldRepeatCount = feedback.filter(f => f.would_repeat).length;
  const favoriteMoments = feedback.filter(f => f.favorite_moment?.trim()).map(f => f.favorite_moment);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
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
            <div className="space-y-2">
              {favoriteMoments.slice(0, 3).map((moment, index) => (
                <p key={index} className="text-sm text-muted-foreground italic leading-relaxed">
                  "{moment}"
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