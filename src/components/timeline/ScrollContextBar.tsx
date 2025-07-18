import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { MapPin, Users, Zap, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ScrollContextBarProps {
  currentMoment: any;
  scrollVelocity: number;
  scrollDirection: 'up' | 'down' | 'idle';
  momentProgress: number;
  transitionProgress: number;
  className?: string;
}

export function ScrollContextBar({
  currentMoment,
  scrollVelocity,
  scrollDirection,
  momentProgress,
  transitionProgress,
  className = ''
}: ScrollContextBarProps) {
  if (!currentMoment) return null;

  const isScrolling = scrollVelocity > 0.1;
  const metadata = currentMoment.metadata || {};
  
  // Extract location data
  const location = metadata.location || metadata.venue_name || 'Unknown location';
  const peopleCount = metadata.people_encountered?.length || 0;
  const vibeIntensity = metadata.vibe_intensity || 0;

  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'h:mm a');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ 
        opacity: isScrolling ? 1 : 0.7, 
        x: 0,
        scale: isScrolling ? 1.02 : 1 
      }}
      className={`fixed left-4 top-1/2 transform -translate-y-1/2 z-40 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg max-w-xs ${className}`}
    >
      {/* Scroll direction indicator */}
      <div className="flex items-center gap-2 mb-3">
        <motion.div
          animate={{ 
            rotateX: scrollDirection === 'down' ? 0 : 180,
            opacity: isScrolling ? 1 : 0.3
          }}
          transition={{ type: "spring", stiffness: 300 }}
          className="text-primary"
        >
          <Navigation className="h-4 w-4" />
        </motion.div>
        <span className="text-sm text-muted-foreground">
          {formatTime(currentMoment.timestamp)}
        </span>
        {isScrolling && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="ml-auto"
          >
            <Badge variant="secondary" className="text-xs">
              {scrollDirection === 'down' ? '↓' : '↑'}
            </Badge>
          </motion.div>
        )}
      </div>

      {/* Current moment title */}
      <motion.h3 
        key={currentMoment.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-medium text-foreground mb-3 line-clamp-2"
      >
        {currentMoment.title}
      </motion.h3>

      {/* Context information */}
      <div className="space-y-2">
        {/* Location */}
        <AnimatePresence mode="wait">
          {location && location !== 'Unknown location' && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-2 text-sm"
            >
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground truncate">{location}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* People encountered */}
        <AnimatePresence mode="wait">
          {peopleCount > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-2 text-sm"
            >
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vibe intensity */}
        <AnimatePresence mode="wait">
          {vibeIntensity > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-2 text-sm"
            >
              <Zap className="h-3 w-3 text-muted-foreground" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">Energy</span>
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${vibeIntensity * 10}%` }}
                      transition={{ type: "spring", stiffness: 200 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Moment progress indicator */}
      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Progress</span>
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${momentProgress * 100}%` }}
              transition={{ type: "spring", stiffness: 200 }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {Math.round(momentProgress * 100)}%
          </span>
        </div>
      </div>

      {/* Transition indicator */}
      <AnimatePresence>
        {transitionProgress > 0 && transitionProgress < 1 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 text-xs text-muted-foreground"
          >
            Transitioning to next moment...
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}