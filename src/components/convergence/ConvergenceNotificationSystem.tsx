import React, { useCallback, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, Navigation, X, MapPin, Clock, Zap } from 'lucide-react';
import { useConvergenceDetection } from '@/hooks/useConvergenceDetection';
import { useEnhancedHaptics } from '@/hooks/useEnhancedHaptics';
import { eventBridge } from '@/services/eventBridge';
import type { ConvergenceResult } from '@/lib/convergence/MultiAgentConvergenceCalculator';

// Friend avatar component with fallback
const FriendAvatar: React.FC<{ friendId: string; size?: number }> = ({ friendId, size = 32 }) => {
  return (
    <div 
      className="rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-border/50"
      style={{ width: size, height: size }}
    >
      <span className="text-xs font-medium text-foreground/80">
        {friendId.slice(-2).toUpperCase()}
      </span>
    </div>
  );
};

// Enhanced progress bar with pulsing animation
const ConvergenceProbability: React.FC<{ probability: number; timeToMeet: number }> = ({ 
  probability, 
  timeToMeet 
}) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  const getProbabilityColor = (prob: number) => {
    if (prob >= 0.8) return 'from-green-500 to-emerald-400';
    if (prob >= 0.6) return 'from-blue-500 to-cyan-400';
    return 'from-yellow-500 to-orange-400';
  };

  const getProbabilityLabel = (prob: number) => {
    if (prob >= 0.85) return 'Very High';
    if (prob >= 0.7) return 'High';
    if (prob >= 0.55) return 'Medium';
    return 'Low';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-medium text-foreground">
            {getProbabilityLabel(probability)}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div 
            className={`h-full bg-gradient-to-r ${getProbabilityColor(probability)}`}
            initial={{ width: 0 }}
            animate={{ width: animate ? `${probability * 100}%` : 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>{timeToMeet < 60 ? `${Math.round(timeToMeet)}s` : `${Math.round(timeToMeet/60)}m`}</span>
      </div>
    </div>
  );
};

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
  const [isExpanded, setIsExpanded] = useState(false);

  const friendIds = convergence.agentIds.filter(id => id !== 'self');
  const friendNames = friendIds.map(id => `Friend ${id.slice(-4)}`);

  const formatTimeToMeet = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const getConvergenceIcon = () => {
    if (convergence.probability >= 0.8) return <Zap className="w-5 h-5" />;
    return <Users className="w-5 h-5" />;
  };

  const getNotificationTitle = () => {
    if (convergence.agentIds.length === 2) {
      return `Converging with ${friendNames[0]}`;
    }
    return `Group convergence detected`;
  };

  const getNotificationSubtitle = () => {
    if (convergence.agentIds.length > 2) {
      return `${convergence.agentIds.length} people heading to same area`;
    }
    return `High probability meeting point identified`;
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
      style={{ top: `calc(${4 + index * (isExpanded ? 120 : 100)}px + env(safe-area-inset-top))` }}
    >
      <motion.div 
        className="bg-background/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-border/50"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-start gap-3">
          {/* Enhanced Icon with friend count indicator */}
          <div className="flex-shrink-0 relative">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-lg">
              {getConvergenceIcon()}
            </div>
            {convergence.agentIds.length > 2 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                <span className="text-[10px] font-bold text-accent-foreground">
                  {convergence.agentIds.length}
                </span>
              </div>
            )}
          </div>

          {/* Enhanced Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-foreground font-semibold text-sm">
                {getNotificationTitle()}
              </p>
              {convergence.probability >= 0.8 && (
                <div className="px-2 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">
                  <span className="text-[10px] font-medium text-green-600">HIGH</span>
                </div>
              )}
            </div>
            
            <p className="text-muted-foreground text-xs mb-2">
              {getNotificationSubtitle()}
            </p>

            {/* Friend Avatars */}
            <div className="flex items-center gap-1 mb-3">
              {friendIds.slice(0, 3).map((friendId) => (
                <FriendAvatar key={friendId} friendId={friendId} size={24} />
              ))}
              {friendIds.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">+{friendIds.length - 3}</span>
                </div>
              )}
            </div>
            
            {/* Venue Context */}
            {convergence.nearestVenue && (
              <div className="flex items-center gap-1 text-muted-foreground text-xs mb-2">
                <MapPin className="w-3 h-3" />
                <span>Near {convergence.nearestVenue.name}</span>
                <span className="text-xs text-accent">
                  ({Math.round(convergence.nearestVenue.popularity)}% popular)
                </span>
              </div>
            )}
            
            {/* Enhanced Progress Bar */}
            <ConvergenceProbability 
              probability={convergence.probability} 
              timeToMeet={convergence.timeToMeet} 
            />
          </div>

          {/* Enhanced Actions */}
          <div className="flex flex-col gap-2">
            <motion.button
              onClick={handleCreateRally}
              className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-full text-primary-foreground text-xs font-medium transition-colors flex items-center gap-1 shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Create Rally"
            >
              <Navigation className="w-3 h-3" />
              Rally
            </motion.button>
            
            <button
              onClick={handleDismiss}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Enhanced suppress option for first notification */}
        {index === 0 && (
          <motion.button
            onClick={handleSuppress}
            className="mt-3 text-[10px] text-muted-foreground hover:text-foreground transition-colors bg-muted/30 hover:bg-muted/50 px-2 py-1 rounded-full"
            whileHover={{ scale: 1.02 }}
          >
            Don't show similar for 30s
          </motion.button>
        )}
      </motion.div>
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