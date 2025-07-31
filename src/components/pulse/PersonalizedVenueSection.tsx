import { useAuth } from '@/providers/AuthProvider';
import { useGeo } from '@/hooks/useGeo';
import { usePersonalizedVenues } from '@/hooks/usePersonalizedVenues';
import { useWeightedScoring } from '@/hooks/useWeightedScoring';
import { TrendingVenueCard } from '@/components/ui/TrendingVenueCard';
import { EnhancedRecommendationCard } from '@/components/ui/EnhancedRecommendationCard';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonalizedVenueSectionProps {
  className?: string;
  maxResults?: number;
  showTitle?: boolean;
}

export const PersonalizedVenueSection = ({ 
  className, 
  maxResults = 5,
  showTitle = true 
}: PersonalizedVenueSectionProps) => {
  const { user } = useAuth();
  const { coords } = useGeo();
  const { calculateScore } = useWeightedScoring();
  
  const { data: personalizedVenues = [], isLoading, error } = usePersonalizedVenues(
    coords?.lat ?? null,
    coords?.lng ?? null,
    {
      radius: 2000,
      limit: maxResults * 2, // Get extra to filter and sort
    }
  );

  // Sort venues by personalized score and weighted scoring
  const sortedVenues = personalizedVenues
    .map(venue => ({
      ...venue,
      weighted_score: calculateScore({
        distance: venue.distance_m,
        rating: venue.rating || 0,
        live_count: venue.live_count,
      })
    }))
    .sort((a, b) => {
      // Combine personalized score (from AI) with weighted score (user preferences)
      const scoreA = (a.personalized_score * 0.6) + (a.weighted_score * 0.4);
      const scoreB = (b.personalized_score * 0.6) + (b.weighted_score * 0.4);
      return scoreB - scoreA;
    })
    .slice(0, maxResults);

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {showTitle && (
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
            <h2 className="font-bold text-white text-lg">Smart Recommendations</h2>
            <Badge variant="secondary" className="bg-white/10 text-white/80 border-white/20">
              AI Powered
            </Badge>
          </div>
        )}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-white/10 rounded-2xl animate-pulse border border-white/20"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || sortedVenues.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        {showTitle && (
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-white/70" />
            <h2 className="font-bold text-white text-lg">Recommended for you</h2>
          </div>
        )}
        <div className="text-center py-8 text-white/70">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No personalized venues available right now</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {showTitle && (
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-lg">Smart Recommendations</h2>
          <Badge variant="secondary" className="bg-white/10 text-white/80 border-white/20">
            AI Powered
          </Badge>
        </div>
      )}
      
      <div className="space-y-4">
        {sortedVenues.map((venue) => {
          // Use TrendingVenueCard for consistent styling
          return (
            <div key={venue.venue_id} className="relative">
              <TrendingVenueCard
                venue={{
                  id: venue.venue_id,
                  name: venue.name,
                  distance_m: venue.distance_m,
                  people_now: venue.live_count,
                  trend_score: Math.round(venue.personalized_score * 100),
                  vibe_tag: venue.categories?.[0] || 'venue',
                  last_seen_at: new Date().toISOString(),
                }}
                onJoin={() => console.log('Join venue:', venue.name)}
                onShare={() => console.log('Share venue:', venue.name)}
                onLike={() => console.log('Like venue:', venue.name)}
                onChat={() => console.log('Chat venue:', venue.name)}
              />
              
              {/* Smart badge overlay */}
              <div className="absolute top-3 right-3">
                <Badge 
                  variant="secondary" 
                  className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border-white/30 text-xs"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {Math.round(venue.personalized_score * 100)}% match
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};