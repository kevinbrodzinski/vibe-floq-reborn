import React, { useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, Navigation, X, MapPin } from 'lucide-react';
import { useConvergenceDetection } from '@/hooks/useConvergenceDetection';
import { useEnhancedHaptics } from '@/hooks/useEnhancedHaptics';
import { eventBridge } from '@/services/eventBridge';
import type { ConvergenceResult } from '@/lib/convergence/MultiAgentConvergenceCalculator';

interface ConvergenceNotificationProps {
  convergence: ConvergenceResult;
  onDismiss: (convergence: ConvergenceResult, suppress?: boolean) => void;
  onCreateRally: (convergence: ConvergenceResult) => void;
  index: number;
}

const ConvergenceNotification: React.FC<ConvergenceNotificationProps> = ({
  convergence,
  onDismiss,
  onCreateRally,
  index
}) => {
  const { triggerHaptic } = useEnhancedHaptics();

  const friendNames = convergence.agentIds
    .filter(id => id !== 'self')
    .map(id => `Friend ${id.slice(-4)}`); // Simplified for demo

  const formatTimeToMeet = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const handleCreateRally = () => {
    triggerHaptic('success');
    onCreateRally(convergence);
  };

  const handleDismiss = () => {
    triggerHaptic('light');
    onDismiss(convergence, false);
  };

  const handleSuppress = () => {
    triggerHaptic('light');
    onDismiss(convergence, true);
  };

  return (
    <motion.div
      initial={{ y: -100, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -100, opacity: 0, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        delay: index * 0.1
      }}
      className="fixed left-4 right-4 z-[700] pointer-events-auto"
      style={{ top: `calc(${4 + index * 80}px + env(safe-area-inset-top))` }}
    >
      <div className="bg-background/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-border">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-medium text-sm">
              {convergence.agentIds.length === 2 
                ? `Crossing paths with ${friendNames[0]}`
                : `Group convergence: ${convergence.agentIds.length} people`
              }
            </p>
            
            <div className="flex items-center gap-2 mt-1">
              {convergence.nearestVenue ? (
                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                  <MapPin className="w-3 h-3" />
                  <span>Near {convergence.nearestVenue.name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">Nearby location</span>
              )}
              
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-muted-foreground text-xs">
                {formatTimeToMeet(convergence.timeToMeet)}
              </span>
            </div>
            
            {/* Confidence indicator */}
            <div className="flex items-center gap-2 mt-3">
              <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-primary to-primary/80"
                  initial={{ width: 0 }}
                  animate={{ width: `${convergence.probability * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">
                {Math.round(convergence.probability * 100)}%
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateRally}
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 rounded-full text-primary text-xs font-medium transition-colors flex items-center gap-1"
              aria-label="Create Rally"
            >
              <Navigation className="w-3 h-3" />
              Rally
            </button>
            
            <button
              onClick={handleDismiss}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick suppress option for first notification */}
        {index === 0 && (
          <button
            onClick={handleSuppress}
            className="mt-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Don't show similar for 30s
          </button>
        )}
      </div>
    </motion.div>
  );
};

export const ConvergenceNotificationSystem: React.FC = () => {
  const { activeConvergences, suppressConvergence } = useConvergenceDetection();
  const { triggerHaptic } = useEnhancedHaptics();

  // Handle rally creation
  const handleCreateRally = useCallback(async (convergence: ConvergenceResult) => {
    try {
      // Emit rally creation event with convergence data
      eventBridge.emit('RALLY_CREATE_REQUEST', {
        location: {
          lat: convergence.convergencePoint[1],
          lng: convergence.convergencePoint[0],
          venueName: convergence.nearestVenue?.name
        },
        invitees: convergence.agentIds.filter(id => id !== 'self'),
        message: convergence.nearestVenue 
          ? `Meeting up near ${convergence.nearestVenue.name}` 
          : 'Meeting up here',
        autoExpire: 600, // 10 minutes
        type: 'convergence'
      });

      // Navigate to location
      eventBridge.emit('UI_MAP_FLY_TO', {
        center: convergence.convergencePoint,
        zoom: 17,
        duration: 1000
      });

      triggerHaptic('success');
    } catch (error) {
      console.error('Failed to create convergence rally:', error);
      triggerHaptic('error');
    }
  }, [triggerHaptic]);

  // Handle notification dismissal
  const handleDismiss = useCallback((convergence: ConvergenceResult, suppress = false) => {
    if (suppress) {
      suppressConvergence(convergence);
    }
    triggerHaptic('light');
  }, [suppressConvergence, triggerHaptic]);

  // Listen for convergence detection events
  React.useEffect(() => {
    const handleConvergenceDetected = (convergence: ConvergenceResult) => {
      triggerHaptic('convergence');
    };

    eventBridge.on('CONVERGENCE_DETECTED', handleConvergenceDetected);
    return () => {
      eventBridge.off('CONVERGENCE_DETECTED', handleConvergenceDetected);
    };
  }, [triggerHaptic]);

  return (
    <AnimatePresence mode="sync">
      {activeConvergences.map((convergence, index) => {
        const notificationId = `conv-${convergence.agentIds.sort().join('-')}`;
        
        return (
          <ConvergenceNotification
            key={notificationId}
            convergence={convergence}
            onDismiss={handleDismiss}
            onCreateRally={handleCreateRally}
            index={index}
          />
        );
      })}
    </AnimatePresence>
  );
};