
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Achievement } from '@/hooks/useAchievements';
import * as LucideIcons from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { zIndex } from '@/constants/z';

interface AchievementToastProps {
  achievement: Achievement;
  onDismiss: () => void;
  autoHideDuration?: number;
}

export function AchievementToast({ 
  achievement, 
  onDismiss, 
  autoHideDuration = 4000 
}: AchievementToastProps) {
  const IconComponent = (LucideIcons as any)[achievement.icon] || LucideIcons.Award;
  
  useEffect(() => {
    const timer = setTimeout(onDismiss, autoHideDuration);
    return () => clearTimeout(timer);
  }, [onDismiss, autoHideDuration]);

  const isRare = achievement.metadata?.rarity === 'rare' || achievement.metadata?.rarity === 'legendary';

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 25,
          duration: 0.6
        }
      }}
      exit={{ 
        opacity: 0, 
        y: -20, 
        scale: 0.95,
        transition: { duration: 0.3 }
      }}
      className={cn(
        "relative flex items-center gap-3 p-4 rounded-lg border shadow-lg",
        "bg-background/95 backdrop-blur-sm",
        "max-w-sm mx-auto",
        isRare && "border-primary/50 shadow-primary/20"
      )}
    >
      {/* Celebration particles for rare achievements */}
      {isRare && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary rounded-full"
              style={{
                left: `${20 + (i * 10)}%`,
                top: `${20 + (i % 3) * 20}%`,
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                repeat: 1,
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Achievement icon */}
      <motion.div
        className={cn(
          "flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center",
          "border-primary bg-primary/10 text-primary"
        )}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ 
          scale: 1, 
          rotate: 0,
          transition: {
            type: "spring",
            stiffness: 400,
            damping: 15,
            delay: 0.2
          }
        }}
      >
        <IconComponent size={24} />
      </motion.div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <motion.p 
            className="font-semibold text-sm text-foreground"
            initial={{ opacity: 0, x: -20 }}
            animate={{ 
              opacity: 1, 
              x: 0,
              transition: { delay: 0.3 }
            }}
          >
            🎉 Achievement Unlocked!
          </motion.p>
          {isRare && (
            <Badge variant="default" className="text-xs px-1.5 py-0">
              {achievement.metadata?.rarity || 'Rare'}
            </Badge>
          )}
        </div>
        
        <motion.h4 
          className="font-medium text-sm text-foreground mb-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ 
            opacity: 1, 
            x: 0,
            transition: { delay: 0.4 }
          }}
        >
          {achievement.name}
        </motion.h4>
        
        <motion.p 
          className="text-xs text-muted-foreground line-clamp-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ 
            opacity: 1, 
            x: 0,
            transition: { delay: 0.5 }
          }}
        >
          {achievement.description}
        </motion.p>
      </div>

      {/* Dismiss button */}
      <motion.button
        onClick={onDismiss}
        className="flex-shrink-0 w-6 h-6 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          transition: { delay: 0.6 }
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <X size={12} />
      </motion.button>
    </motion.div>
  );
}

// Container for managing multiple toasts
export function AchievementToastContainer() {
  const { events, dismissEvent, clearExpiredEvents } = useAchievementToastStore();
  
  useEffect(() => {
    const interval = setInterval(clearExpiredEvents, 30000); // Clean up every 30s
    return () => clearInterval(interval);
  }, [clearExpiredEvents]);

  const activeEvents = events.filter(event => !event.dismissed).slice(0, 3); // Max 3 visible

  return (
    <div 
      className="fixed top-4 right-4 space-y-2 pointer-events-none"
      {...zIndex('toast')}
    >
      <AnimatePresence mode="popLayout">
        {activeEvents.map((event) => (
          <div key={event.id} className="pointer-events-auto">
            <AchievementToast
              achievement={event.achievement}
              onDismiss={() => dismissEvent(event.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Import the store
import { useAchievementToastStore } from '@/store/achievementToastStore';
