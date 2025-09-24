import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeFloqUpdates } from '@/hooks/useRealtimeFloqUpdates';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { UserPlus, UserMinus, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealtimeAnimationsProps {
  floqId: string;
  className?: string;
}

export function RealtimeAnimations({ floqId, className }: RealtimeAnimationsProps) {
  const { getRecentEventsForFloq, getEnergyTrend } = useRealtimeFloqUpdates([floqId]);
  const { shouldReduceMotion } = usePerformanceOptimization();
  
  const recentEvents = getRecentEventsForFloq(floqId);
  const energyTrend = getEnergyTrend(floqId);
  
  if (shouldReduceMotion) return null;

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'member_joined': return <UserPlus className="w-3 h-3" />;
      case 'member_left': return <UserMinus className="w-3 h-3" />;
      case 'energy_changed': return <Zap className="w-3 h-3" />;
      default: return null;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'member_joined': return 'text-success';
      case 'member_left': return 'text-warning';
      case 'energy_changed': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Energy trend indicator */}
      {energyTrend !== 'stable' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={cn(
            "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
            energyTrend === 'rising' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
          )}
        >
          {energyTrend === 'rising' ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
        </motion.div>
      )}

      {/* Recent activity pulses */}
      <AnimatePresence>
        {recentEvents.slice(0, 3).map((event, index) => (
          <motion.div
            key={`${event.floqId}-${event.timestamp}`}
            initial={{ opacity: 0, scale: 0, x: 20 }}
            animate={{ 
              opacity: [1, 0.7, 0],
              scale: [0.8, 1, 1.2],
              x: [20, 0, -20]
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              duration: 2,
              delay: index * 0.3,
              times: [0, 0.5, 1]
            }}
            className={cn(
              "absolute top-0 right-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs",
              "bg-background/80 backdrop-blur border",
              getEventColor(event.type)
            )}
            style={{
              zIndex: 10 - index
            }}
          >
            {getEventIcon(event.type)}
            <span className="font-medium">
              {event.type === 'member_joined' && '+1'}
              {event.type === 'member_left' && '-1'}
              {event.type === 'energy_changed' && '⚡'}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Pulse animation for high activity */}
      {recentEvents.length > 2 && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-primary/30 pointer-events-none"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0, 0.5, 0]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 0.5
          }}
        />
      )}
    </div>
  );
}

// Live member count with smooth transitions
export function LiveMemberCount({ 
  floqId, 
  currentCount = 0 
}: { 
  floqId: string; 
  currentCount?: number; 
}) {
  const { getFloqData } = useRealtimeFloqUpdates([floqId]);
  const { shouldReduceMotion } = usePerformanceOptimization();
  
  const realtimeData = getFloqData(floqId);
  const displayCount = realtimeData?.participants ?? currentCount;
  
  return (
    <motion.span
      key={displayCount}
      initial={shouldReduceMotion ? {} : { scale: 0.8, color: 'var(--success)' }}
      animate={{ scale: 1, color: 'var(--foreground)' }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {displayCount}
    </motion.span>
  );
}

// Smooth energy level animation
export function LiveEnergyLevel({ 
  floqId, 
  currentEnergy = 0.5 
}: { 
  floqId: string; 
  currentEnergy?: number; 
}) {
  const { getFloqData } = useRealtimeFloqUpdates([floqId]);
  const { shouldReduceMotion } = usePerformanceOptimization();
  
  const realtimeData = getFloqData(floqId);
  const displayEnergy = realtimeData?.energy_now ?? currentEnergy;
  
  if (shouldReduceMotion) {
    return <span>{Math.round(displayEnergy * 100)}%</span>;
  }
  
  return (
    <motion.div
      className="flex items-center gap-2"
      initial={false}
    >
      <motion.div
        className="w-12 h-2 bg-muted rounded-full overflow-hidden"
        layout
      >
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-success rounded-full"
          animate={{ width: `${displayEnergy * 100}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        />
      </motion.div>
      <motion.span
        animate={{ color: displayEnergy > 0.7 ? 'var(--success)' : 'var(--foreground)' }}
        transition={{ duration: 0.3 }}
      >
        {Math.round(displayEnergy * 100)}%
      </motion.span>
    </motion.div>
  );
}