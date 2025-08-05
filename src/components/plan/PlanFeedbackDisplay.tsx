import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users, Heart, TrendingUp, Meh, Frown } from 'lucide-react';
import { usePlanFeedback } from '@/hooks/usePlanFeedback';
import { Skeleton } from '@/components/ui/skeleton';
import { PlanReflectionCard } from './PlanReflectionCard';

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

        {/* Individual Reflections */}
        {feedback.length > 0 && (
          <div className="space-y-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Individual Reflections
            </span>
            <div className="space-y-3">
              {feedback.slice(0, 5).map((reflection, index) => (
                <PlanReflectionCard 
                  key={reflection.id || index}
                  reflection={{
                    id: reflection.id || `feedback-${index}`,
                    profile_id: reflection.profile_id || '',
                    user_display_name: (reflection as any).user_display_name || 'Anonymous',
                    user_avatar_url: (reflection as any).user_avatar_url,
                    vibe_rating: reflection.vibe_rating,
                    favorite_moment: reflection.favorite_moment,
                    would_repeat: reflection.would_repeat,
                    created_at: reflection.created_at || new Date().toISOString(),
                    vibe: reflection.vibe_rating && reflection.vibe_rating >= 4 ? 'energetic' : reflection.vibe_rating && reflection.vibe_rating >= 3 ? 'chill' : 'cozy'
                  }}
                />
              ))}
              {feedback.length > 5 && (
                <div className="text-center">
                  <Badge variant="outline" className="text-xs">
                    +{feedback.length - 5} more reflection{feedback.length - 5 !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}