import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

interface TimelineProgressBarProps {
  scrollProgress: number;
  currentMomentIndex: number;
  moments: any[];
  className?: string;
}

export function TimelineProgressBar({ 
  scrollProgress, 
  currentMomentIndex, 
  moments, 
  className = '' 
}: TimelineProgressBarProps) {
  if (moments.length === 0) return null;

  const currentMoment = moments[currentMomentIndex] || moments[0];
  const firstMoment = moments[0];
  const lastMoment = moments[moments.length - 1];

  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'h:mm a');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-background/95 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg ${className}`}
    >
      <div className="flex items-center gap-3 min-w-[300px]">
        {/* Time indicator */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {formatTime(firstMoment.timestamp)}
          </span>
          <span className="text-primary font-medium">
            {formatTime(currentMoment.timestamp)}
          </span>
          <span className="text-muted-foreground">
            {formatTime(lastMoment.timestamp)}
          </span>
        </div>

        {/* Progress bar with ARIA attributes */}
        <div className="flex-1 relative">
          <div 
            className="h-2 bg-muted rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(scrollProgress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Timeline scroll progress"
          >
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${scrollProgress * 100}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
          
          {/* Moment indicators - fixed NaN issue */}
          <div className="absolute top-0 left-0 w-full h-2 flex items-center">
            {moments.map((moment, index) => {
              // Guard against NaN when length === 1
              const position = moments.length > 1 ? (index / (moments.length - 1)) * 100 : 50;
              const isActive = index === currentMomentIndex;
              
              return (
                <motion.div
                  key={moment.id || index}
                  className={`absolute w-3 h-3 rounded-full border-2 border-background transform -translate-x-1/2 -translate-y-0.5 ${
                    isActive ? 'bg-primary scale-125' : 'bg-muted-foreground/50'
                  }`}
                  style={{ 
                    left: `${position}%`,
                    backgroundColor: isActive ? undefined : moment.color || '#6b7280'
                  }}
                  animate={{ 
                    scale: isActive ? 1.25 : 1,
                    backgroundColor: isActive ? 'hsl(var(--primary))' : moment.color || '#6b7280'
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              );
            })}
          </div>
        </div>

        {/* Current moment info */}
        <div className="text-sm text-right min-w-[80px]">
          <div className="text-xs text-muted-foreground">
            {currentMomentIndex + 1} of {moments.length}
          </div>
          <div className="font-medium text-foreground truncate max-w-[120px]">
            {currentMoment.title}
          </div>
        </div>
      </div>
    </motion.div>
  );
}