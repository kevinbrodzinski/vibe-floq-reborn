
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { zIndex } from '@/constants/z';

interface ParticipantUpdate {
  id: string;
  username: string;
  avatar?: string;
  action: 'joined' | 'left' | 'moved';
  location?: string;
  timestamp: number;
}

interface LiveParticipantTrackerProps {
  updates?: ParticipantUpdate[];
  maxVisible?: number;
  displayDuration?: number;
  className?: string;
}

const ACTION_COLORS = {
  joined: 'bg-green-500/10 text-green-600 border-green-500/20',
  left: 'bg-red-500/10 text-red-600 border-red-500/20',
  moved: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
} as const;

const ACTION_ICONS = {
  joined: User,
  left: User,
  moved: MapPin,
} as const;

export const LiveParticipantTracker: React.FC<LiveParticipantTrackerProps> = ({
  updates = [],
  maxVisible = 3,
  displayDuration = 4000,
  className = ""
}) => {
  const [visibleUpdates, setVisibleUpdates] = useState<ParticipantUpdate[]>([]);

  useEffect(() => {
    const now = Date.now();
    const filtered = updates
      .filter(update => now - update.timestamp < displayDuration)
      .slice(-maxVisible);
    
    setVisibleUpdates(filtered);
  }, [updates, maxVisible, displayDuration]);

  return (
    <div 
      {...zIndex('toast')}
      className={`fixed top-20 right-4 space-y-2 pointer-events-none ${className}`}
    >
      <AnimatePresence>
        {visibleUpdates.map((update) => {
          const IconComponent = ACTION_ICONS[update.action];
          const colorClass = ACTION_COLORS[update.action];

          return (
            <motion.div
              key={update.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                x: 0, 
                scale: 1,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }
              }}
              exit={{ 
                opacity: 0, 
                x: 100, 
                scale: 0.9,
                transition: { duration: 0.3 }
              }}
              className={`
                pointer-events-auto bg-background/95 backdrop-blur-sm 
                rounded-lg border p-3 shadow-lg max-w-xs
                ${colorClass}
              `}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <IconComponent className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {update.username}{' '}
                    <span className="font-normal">
                      {update.action === 'joined' && 'joined'}
                      {update.action === 'left' && 'left'}
                      {update.action === 'moved' && 'moved'}
                    </span>
                  </p>
                  
                  {update.location && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {update.location}
                    </p>
                  )}
                </div>

                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  Live
                </Badge>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
