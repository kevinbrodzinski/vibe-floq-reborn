import { useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useGeo } from '@/hooks/useGeo';
import { usePersonalizedVenues } from '@/hooks/usePersonalizedVenues';
import { useWeightedScoring } from '@/hooks/useWeightedScoring';
import { TrendingVenueCard } from '@/components/ui/TrendingVenueCard';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface PersonalizedVenueSectionProps {
  className?: string;
  maxResults?: number;
  showTitle?: boolean;
  onConfigureClick?: () => void;
}

export const PersonalizedVenueSection = ({ 
  className, 
  maxResults = 5,
  showTitle = true,
  onConfigureClick
}: PersonalizedVenueSectionProps) => {
  const { user } = useAuth();
  const { coords, status: geoStatus } = useGeo();
  const { calculateScore } = useWeightedScoring();
  
  const { data: personalizedVenues = [], isLoading, error } = usePersonalizedVenues(
    coords?.lat ?? null,
    coords?.lng ?? null,
    {
      radius: 2000,
      limit: maxResults * 2, // Get extra to filter and sort
    }
  );

  // Show location-specific messaging when location is the issue
  const isLocationIssue = !coords && (geoStatus === 'error' || geoStatus === 'loading');

  // Memoize sorted venues to avoid re-sorting on every render
  const sortedVenues = useMemo(() => {
    return personalizedVenues
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
        const scoreA = ((a.personalized_score ?? 0) * 0.6) + (a.weighted_score * 0.4);
        const scoreB = ((b.personalized_score ?? 0) * 0.6) + (b.weighted_score * 0.4);
        return scoreB - scoreA;
      })
      .slice(0, maxResults);
  }, [personalizedVenues, calculateScore, maxResults]);

  if (isLoading) {
    return (
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.15 }}
        className={cn("space-y-4", className)}
      >
        {showTitle && (
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
            <h2 className="font-bold text-white text-lg">⚡ Personalized picks</h2>
            <Badge variant="secondary" className="bg-white/10 text-white/80 border-white/20">
              Loading...
            </Badge>
          </div>
        )}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={`skeleton-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="h-24 bg-white/10 rounded-2xl animate-pulse border border-white/20"
            />
          ))}
        </div>
      </motion.section>
    );
  }

  if (error || sortedVenues.length === 0) {
    return (
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.15 }}
        className={cn("space-y-4", className)}
      >
        {showTitle && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white/70" />
              <h2 className="font-bold text-white text-lg">⚡ Personalized picks</h2>
            </div>
            {onConfigureClick && (
              <button
                onClick={onConfigureClick}
                aria-label="Open personalization settings"
                className="text-xs text-white/70 hover:text-white transition-colors flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                Configure
              </button>
            )}
          </div>
        )}
        <div className="text-center py-8 text-white/70 bg-white/5 rounded-2xl border border-white/10">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
          {isLocationIssue ? (
            <>
              <p className="text-sm font-medium mb-1">Location needed for smart picks</p>
              <p className="text-xs opacity-75">Enable location services to get personalized venue recommendations</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium mb-1">No smart picks yet</p>
              <p className="text-xs opacity-75">Try adjusting your preferences or explore more venues</p>
            </>
          )}
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.15 }}
      className={cn("space-y-4 min-h-[400px]", className)} // Min height to prevent layout shift
    >
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" />
            <h2 className="font-bold text-white text-lg">⚡ Personalized picks</h2>
            <Badge variant="secondary" className="bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-primary/20 text-white/90 border-white/30 text-xs">
              Smart
            </Badge>
          </div>
          {onConfigureClick && (
            <button
              onClick={onConfigureClick}
              aria-label="Open personalization settings"
              className="text-xs text-white/70 hover:text-white transition-colors flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              Configure
            </button>
          )}
        </div>
      )}
      
      <AnimatePresence mode="popLayout">
        <div className="space-y-4">
          {sortedVenues.map((venue, index) => {
            // Cap entrance delay at 8 cards to avoid slow devices waiting 600ms
            const delay = Math.min(index, 7) * 0.05;
            
            return (
              <motion.div 
                key={venue.venue_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay, duration: 0.15 }}
                className="relative"
              >
                <TrendingVenueCard
                  venue={{
                    id: venue.venue_id,
                    name: venue.name,
                    distance_m: venue.distance_m,
                    people_now: venue.live_count,
                    trend_score: Math.round((venue.personalized_score ?? 0) * 100), // NaN protection
                    vibe_tag: venue.categories?.[0] || 'venue',
                    last_seen_at: new Date().toISOString(),
                  }}
                  onJoin={() => console.log('Join venue:', venue.name)}
                  onShare={() => console.log('Share venue:', venue.name)}
                  onLike={() => console.log('Like venue:', venue.name)}
                  onChat={() => console.log('Chat venue:', venue.name)}
                />
                
                {/* Smart badge overlay with theme-aware gradient */}
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: delay + 0.1 }}
                  className="absolute top-3 right-3"
                >
                  <Badge 
                    variant="secondary" 
                    className="bg-gradient-to-r from-primary/30 via-accent/30 to-secondary/30 text-white border-white/40 text-xs backdrop-blur-sm"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {Math.round((venue.personalized_score ?? 0) * 100)}%
                  </Badge>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>
    </motion.section>
  );
};