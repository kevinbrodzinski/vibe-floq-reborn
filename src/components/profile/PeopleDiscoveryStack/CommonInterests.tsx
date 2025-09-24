import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CommonInterestsProps {
  targetId: string;
  className?: string;
}

// Mock hook - will be replaced with real data
const useMockCommonInterests = (targetId: string): string[] => {
  const interests = ['Coffee', 'Photography', 'Jazz Music', 'Art Galleries', 'Hiking'] as const;
  return [...interests]; // Convert readonly to mutable
};

export const CommonInterests: React.FC<CommonInterestsProps> = ({ 
  targetId, 
  className 
}) => {
  const interests = useMockCommonInterests(targetId);

  if (!interests || interests.length === 0) {
    return (
      <Card className={cn("p-4 bg-surface/10 border-border/20 backdrop-blur-sm", className)}>
        <h3 className="text-sm font-medium text-foreground mb-2">Common Interests</h3>
        <div className="text-center py-8">
          <motion.div
            className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted/20 flex items-center justify-center"
            animate={{ rotate: [0, 5, 0, -5, 0] }}
            transition={{ duration: 2, repeat: 3 }}
          >
            <span className="text-2xl">🎯</span>
          </motion.div>
          <p className="text-xs text-muted-foreground">
            No shared interests yet
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4 bg-surface/10 border-border/20 backdrop-blur-sm", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Common Interests</h3>
        <Badge variant="secondary" className="text-xs">
          {interests.length} shared
        </Badge>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {interests.map((interest, index) => (
          <motion.div
            key={interest}
            className="group relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              duration: 0.3, 
              delay: index * 0.04,
              ease: 'easeOut' 
            }}
            whileHover={{ 
              scale: 1.05,
              transition: { duration: 0.2 }
            }}
          >
            <Badge
              role="button"
              tabIndex={0}
              variant="secondary"
              className={cn(
                "text-xs transition-all duration-200 cursor-pointer",
                "group-hover:shadow-[0_0_8px_hsl(var(--primary)/0.6)]",
                "group-hover:border-primary/40",
                "focus:outline-none focus:ring-2 focus:ring-primary/50"
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  // Handle chip click - placeholder for future functionality
                }
              }}
              data-testid={`interest-chip-${interest.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {interest}
            </Badge>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-popover border border-border rounded text-xs text-popover-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              Both into {interest.toLowerCase()}
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
};