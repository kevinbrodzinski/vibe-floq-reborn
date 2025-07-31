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
      <motion.div 
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
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="h-24 bg-white/10 rounded-2xl animate-pulse border border-white/20"
            />
          ))}
        </div>
      </motion.div>
    );
  }

  if (error || sortedVenues.length === 0) {
    return (
      <motion.div 
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
          <p className="text-sm font-medium mb-1">No smart picks yet</p>
          <p className="text-xs opacity-75">Try adjusting your preferences or explore more venues</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.15 }}
      className={cn("space-y-4", className)}
    >
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" />
            <h2 className="font-bold text-white text-lg">⚡ Personalized picks</h2>
            <Badge variant="secondary" className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white/90 border-white/30 text-xs">
              Smart
            </Badge>
          </div>
          {onConfigureClick && (
            <button
              onClick={onConfigureClick}
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
          {sortedVenues.map((venue, index) => (
            <motion.div 
              key={venue.venue_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05, duration: 0.15 }}
              className="relative"
            >
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
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: (index * 0.05) + 0.2 }}
                className="absolute top-3 right-3"
              >
                <Badge 
                  variant="secondary" 
                  className="bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white border-white/40 text-xs backdrop-blur-sm"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {Math.round(venue.personalized_score * 100)}%
                </Badge>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </motion.div>
  );
};