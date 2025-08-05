import React from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CrossStat } from '@/types/discovery';

interface CloseEncountersProps {
  targetId: string;
  className?: string;
}

// Mock hook - will be replaced with real data
const useMockCrossStat = (targetId: string): CrossStat | null => {
  return {
    countWeek: 3,
    lastVenue: 'Blue Bottle Coffee',
    lastAt: '2 hours ago',
    distance: 250 // meters
  };
};

export const CloseEncounters: React.FC<CloseEncountersProps> = ({ 
  targetId, 
  className 
}) => {
  const crossStat = useMockCrossStat(targetId);

  if (!crossStat || crossStat.countWeek === 0) {
    return null; // Hide section if no encounters
  }

  const isNearby = crossStat.distance && crossStat.distance <= 500;

  const sparkLineVariants = {
    hidden: { pathLength: 0 },
    visible: { pathLength: 1 }
  };

  return (
    <Card className={cn("p-4 bg-surface/10 border-border/20 backdrop-blur-sm", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Close Encounters</h3>
        <Badge variant="secondary" className="text-xs">
          {crossStat.countWeek}× this week
        </Badge>
      </div>

      {isNearby && (
        <motion.div
          className="mb-3 p-2 rounded-lg bg-primary/10 border border-primary/20 backdrop-blur-sm"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-xs text-primary">
            📍 You're near their last haunt!
          </p>
        </motion.div>
      )}

      <div className="flex items-center gap-3">
        {/* Animated pin */}
        <motion.div
          className="text-primary"
          animate={{ 
            y: [0, -2, 0],
            rotate: [0, 5, 0, -5, 0]
          }}
          transition={{
            duration: 1,
            repeat: 3,
            ease: 'easeInOut'
          }}
        >
          <MapPin size={16} />
        </motion.div>

        {/* Spark line path */}
        <div className="flex-1 relative h-6">
          <svg className="w-full h-full" viewBox="0 0 100 20">
            <motion.path
              d="M5,10 Q25,5 45,10 T85,10"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              variants={sparkLineVariants}
              initial="hidden"
              animate="visible"
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />
            
            {/* Encounter dots */}
            {[...Array(crossStat.countWeek)].map((_, i) => (
              <motion.circle
                key={i}
                cx={20 + i * 20}
                cy="10"
                r="2"
                fill="hsl(var(--primary))"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  delay: 0.5 + i * 0.2,
                  duration: 0.3,
                  ease: 'easeOut'
                }}
              />
            ))}
          </svg>

          {/* Walking avatar silhouette */}
          <motion.div
            className="absolute top-1/2 w-4 h-4 bg-primary/60 rounded-full"
            style={{ left: `${20 + (crossStat.countWeek - 1) * 20}%` }}
            initial={{ x: -20, y: '-50%' }}
            animate={{ x: 0, y: '-50%' }}
            transition={{ 
              delay: 1.5,
              duration: 1,
              ease: 'easeInOut'
            }}
          />
        </div>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Last seen at <span className="text-foreground font-medium">{crossStat.lastVenue}</span> • {crossStat.lastAt}
      </div>
    </Card>
  );
};