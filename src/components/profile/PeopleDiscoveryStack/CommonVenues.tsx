import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkeletonRows } from '@/components/ui/skeleton-rows';
import { cn } from '@/lib/utils';
import { useLongPress } from '@/hooks/useLongPress';
import { useCommonVenues } from '@/hooks/useCommonVenues';
import type { CommonVenue } from '@/types/discovery';

interface CommonVenuesProps {
  targetId: string;
  className?: string;
}

const getCategoryColor = (category: string) => {
  const colors = {
    cafe: 'from-amber-500/40 to-amber-600/40',
    gallery: 'from-indigo-500/40 to-indigo-600/40', 
    park: 'from-green-500/40 to-green-600/40',
    music: 'from-purple-500/40 to-purple-600/40',
    default: 'from-muted/40 to-muted-foreground/40'
  };
  return colors[category as keyof typeof colors] || colors.default;
};

export const CommonVenues: React.FC<CommonVenuesProps> = ({ 
  targetId, 
  className 
}) => {
  const { data: venues = [], isLoading, isError } = useCommonVenues(targetId);
  const [savedVenues, setSavedVenues] = React.useState<string[]>([]);

  if (isLoading) {
    return (
      <Card className={cn("p-4 bg-surface/10 border-border/20 backdrop-blur-sm", className)}>
        <div className="flex items-center justify-between mb-3">
          <div className="w-24 h-4 bg-muted/30 rounded animate-pulse" />
          <div className="w-16 h-6 bg-muted/30 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <SkeletonRows rows={venues?.length || 3} className="h-8" />
        </div>
      </Card>
    );
  }

  if (isError || !venues || venues.length === 0) {
    return (
      <Card className={cn("p-4 bg-surface/10 border-border/20 backdrop-blur-sm", className)}>
        <h3 className="text-sm font-medium text-foreground mb-2">Common Venues</h3>
        <div className="text-center py-8">
          <motion.div
            className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted/20 flex items-center justify-center"
            animate={{ rotate: [0, 5, 0, -5, 0] }}
            transition={{ duration: 2, repeat: 3 }}
          >
            <span className="text-2xl">🏢</span>
          </motion.div>
          <p className="text-xs text-muted-foreground">
            {isError ? 'Unable to load venues' : 'No shared venues discovered'}
          </p>
        </div>
      </Card>
    );
  }

  const VenueRow: React.FC<{ venue: CommonVenue; index: number }> = ({ venue, index }) => {
    const [isPressed, setIsPressed] = React.useState(false);
    const isSaved = savedVenues.includes(venue.venue_id);
    
    const handleToggleSaved = () => {
      setSavedVenues(prev => {
        if (prev.includes(venue.venue_id)) {
          return prev.filter(id => id !== venue.venue_id);
        } else {
          return [...prev, venue.venue_id];
        }
      });
    };
    
    const { handlers } = useLongPress({
      onLongPress: handleToggleSaved,
      delay: 600
    });

    return (
      <motion.div
        className={cn(
          "relative flex items-center gap-3 p-2 rounded-lg transition-all duration-200",
          "hover:bg-surface/20 cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isPressed && "translate-x-8"
        )}
        style={{ touchAction: 'manipulation' }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ 
          duration: 0.3, 
          delay: index * 0.1,
          ease: 'easeOut' 
        }}
        {...handlers}
        onTouchStart={() => setIsPressed(false)}
        onPointerLeave={() => setIsPressed(false)}
        role="button"
        tabIndex={0}
        aria-pressed={isSaved}
        aria-label={`${venue.name} - ${isSaved ? 'Remove from' : 'Add to'} saved venues`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            // Use same handler logic as touch to keep paths consistent
            handleToggleSaved();
          }
        }}
      >
        {/* Category gradient bar */}
        <div 
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
            `bg-gradient-to-b ${getCategoryColor(venue.category)}`
          )}
        />

        {/* Save icon (revealed on long press) */}
        <motion.div
          className="absolute right-2 top-1/2 transform -translate-y-1/2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ 
            opacity: isPressed || isSaved ? 1 : 0,
            x: isPressed || isSaved ? 0 : 20
          }}
          transition={{ duration: 0.2 }}
        >
          <Star 
            size={16} 
            className={cn(
              "transition-colors duration-200",
              isSaved ? "fill-warning text-warning" : "text-muted-foreground"
            )}
            aria-hidden="true"
          />
          <span className="sr-only">
            {isSaved ? 'Remove from saved venues' : 'Add to saved venues'}
          </span>
        </motion.div>

        <div className="flex-1 min-w-0 pl-3">
          <h4 className="text-sm font-medium text-foreground truncate">
            {venue.name}
          </h4>
          <p className="text-xs text-muted-foreground capitalize">
            {venue.category}
          </p>
        </div>

        <Badge variant="outline" className="text-xs">
          {venue.overlap_visits}× both
        </Badge>
      </motion.div>
    );
  };

  return (
    <Card className={cn("p-4 bg-surface/10 border-border/20 backdrop-blur-sm", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Common Venues</h3>
        <Badge variant="secondary" className="text-xs">
          {venues.length} shared
        </Badge>
      </div>

      <div className="space-y-1">
        {venues.map((venue, index) => (
          <VenueRow key={venue.venue_id} venue={venue} index={index} />
        ))}
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Long press to save favorite venues
      </div>
    </Card>
  );
};