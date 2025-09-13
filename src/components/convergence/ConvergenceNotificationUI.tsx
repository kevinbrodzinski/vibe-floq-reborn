import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, Navigation, X, MapPin, Clock } from 'lucide-react';
import { useConvergencePredictions } from '@/hooks/useConvergencePredictions';
import { useEnhancedHaptics } from '@/hooks/useEnhancedHaptics';
import { eventBridge, Events } from '@/services/eventBridge';

interface NotificationItem {
  id: string;
  prediction: {
    friendId: string;
    friendName: string;
    probability: number;
    timeToMeet: number;
    predictedLocation: {
      lat: number;
      lng: number;
      venueName?: string;
    };
    confidence: number;
    type: 'pair' | 'group';
    participants?: string[];
  };
  displayedAt: number;
  dismissed: boolean;
  actionTaken?: 'rally' | 'navigate' | 'dismissed';
}

interface NotificationSettings {
  enabled: boolean;
  minProbability: number;
  maxNotifications: number;
  cooldownPeriod: number;
  groupNotifications: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  minProbability: 0.75,
  maxNotifications: 3,
  cooldownPeriod: 30000, // 30 seconds
  groupNotifications: true,
};

export const ConvergenceNotificationUI: React.FC<{
  settings?: Partial<NotificationSettings>;
  position?: 'top' | 'bottom';
  className?: string;
}> = ({ 
  settings: userSettings = {}, 
  position = 'top',
  className = '' 
}) => {
  const settings = { ...DEFAULT_SETTINGS, ...userSettings };
  const { subscribe, predictions } = useConvergencePredictions({
    minProbability: settings.minProbability,
    includeGroups: settings.groupNotifications,
  });
  
  const { triggerHaptic } = useEnhancedHaptics();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [suppressedUntil, setSuppressedUntil] = useState<number>(0);
  const notificationQueue = useRef<NotificationItem[]>([]);
  const lastNotificationTime = useRef<number>(0);

  // Process notification queue
  const processQueue = useCallback(() => {
    const now = Date.now();
    
    if (now < suppressedUntil) return;
    if (now - lastNotificationTime.current < 5000) return; // Min 5s between notifications
    
    const activeCount = notifications.filter(n => !n.dismissed).length;
    if (activeCount >= settings.maxNotifications) return;

    const next = notificationQueue.current.shift();
    if (next) {
      setNotifications(prev => [...prev, next]);
      lastNotificationTime.current = now;
      triggerHaptic('convergence');
    }
  }, [suppressedUntil, notifications, settings.maxNotifications, triggerHaptic]);

  // Subscribe to predictions
  useEffect(() => {
    if (!settings.enabled) return () => {};

    const unsubscribe = subscribe((prediction) => {
      // Filter by probability threshold
      if (prediction.probability < settings.minProbability) return;
      
      // Check if we already have a notification for this convergence
      const exists = notifications.some(n => 
        n.prediction.friendId === prediction.friendId &&
        Math.abs(n.prediction.timeToMeet - prediction.timeToMeet) < 30
      );
      
      if (exists) return;

      // Create notification item
      const notification: NotificationItem = {
        id: `notif-${Date.now()}-${Math.random()}`,
        prediction,
        displayedAt: Date.now(),
        dismissed: false,
      };

      // Add to queue
      notificationQueue.current.push(notification);
      processQueue();
    });

    return unsubscribe;
  }, [subscribe, settings, notifications, processQueue]);

  // Process queue periodically
  useEffect(() => {
    const interval = setInterval(processQueue, 1000);
    return () => clearInterval(interval);
  }, [processQueue]);

  // Auto-dismiss old notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNotifications(prev => 
        prev.map(n => {
          // Auto-dismiss after 20 seconds
          if (!n.dismissed && now - n.displayedAt > 20000) {
            return { ...n, dismissed: true };
          }
          return n;
        }).filter(n => 
          // Remove dismissed notifications after fade out
          !(n.dismissed && now - n.displayedAt > 21000)
        )
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle rally creation
  const handleStartRally = useCallback(async (notification: NotificationItem) => {
    const { prediction } = notification;
    
    // Mark as actioned
    setNotifications(prev => 
      prev.map(n => n.id === notification.id 
        ? { ...n, actionTaken: 'rally' as const, dismissed: true }
        : n
      )
    );

    // Create rally at predicted location
    eventBridge.emit(Events.FLOQ_RALLY_START, {
      rallyId: `rally-convergence-${Date.now()}`,
      participants: prediction.participants || [prediction.friendId],
      centroid: {
        lng: prediction.predictedLocation.lng,
        lat: prediction.predictedLocation.lat,
      },
      source: 'convergence',
    });

    // Navigate to location
    eventBridge.emit(Events.UI_MAP_FLY_TO, {
      lng: prediction.predictedLocation.lng,
      lat: prediction.predictedLocation.lat,
      zoom: 17,
      duration: 1000,
    });

    // Haptic feedback
    triggerHaptic('rally');
  }, [triggerHaptic]);

  // Handle navigation
  const handleNavigate = useCallback((notification: NotificationItem) => {
    const { prediction } = notification;
    
    // Mark as actioned
    setNotifications(prev => 
      prev.map(n => n.id === notification.id 
        ? { ...n, actionTaken: 'navigate' as const, dismissed: true }
        : n
      )
    );

    // Navigate to predicted location
    eventBridge.emit(Events.UI_NAV_DEST, {
      lng: prediction.predictedLocation.lng,
      lat: prediction.predictedLocation.lat,
      duration: 1000,
    });

    triggerHaptic('selection');
  }, [triggerHaptic]);

  // Handle dismissal
  const handleDismiss = useCallback((notification: NotificationItem, suppressSimilar = false) => {
    setNotifications(prev => 
      prev.map(n => n.id === notification.id 
        ? { ...n, actionTaken: 'dismissed' as const, dismissed: true }
        : n
      )
    );

    if (suppressSimilar) {
      setSuppressedUntil(Date.now() + settings.cooldownPeriod);
      
      // Clear the queue
      notificationQueue.current = [];
      
      triggerHaptic('light');
    }
  }, [settings.cooldownPeriod, triggerHaptic]);

  // Format time to meet
  const formatTimeToMeet = (seconds: number): string => {
    if (seconds < 60) return 'less than a minute';
    if (seconds < 120) return 'about a minute';
    if (seconds < 300) return `${Math.round(seconds / 60)} minutes`;
    return 'a few minutes';
  };

  // Get icon based on prediction type
  const getIcon = (type: 'pair' | 'group') => {
    return type === 'group' ? Users : Navigation;
  };

  // Calculate position styles
  const getPositionStyles = (index: number) => {
    if (position === 'top') {
      return { top: `calc(${16 + index * 90}px + env(safe-area-inset-top))` };
    } else {
      return { bottom: `calc(${16 + index * 90}px + env(safe-area-inset-bottom))` };
    }
  };

  const activeNotifications = notifications.filter(n => !n.dismissed);

  return (
    <div className={`convergence-notifications ${className}`}>
      <AnimatePresence mode="sync">
        {activeNotifications.map((notification, index) => {
          const Icon = getIcon(notification.prediction.type);
          const isGroup = notification.prediction.type === 'group';
          
          return (
            <motion.div
              key={notification.id}
              initial={{ 
                opacity: 0, 
                y: position === 'top' ? -50 : 50,
                scale: 0.9 
              }}
              animate={{ 
                opacity: 1, 
                y: 0,
                scale: 1 
              }}
              exit={{ 
                opacity: 0, 
                x: 100,
                transition: { duration: 0.2 }
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25,
                delay: index * 0.05,
              }}
              className="fixed left-4 right-4 z-[800] pointer-events-auto"
              style={getPositionStyles(index)}
            >
              <div className="convergence-notification bg-background/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-border overflow-hidden">
                {/* Progress bar showing time until convergence */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted">
                  <motion.div
                    className="h-full bg-gradient-to-r from-pink-500 to-violet-500"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ 
                      duration: notification.prediction.timeToMeet,
                      ease: 'linear' 
                    }}
                  />
                </div>

                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon with pulse animation */}
                    <motion.div 
                      className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-pink-500 to-violet-500 rounded-full flex items-center justify-center relative"
                      animate={{ 
                        boxShadow: [
                          '0 0 0 0 rgba(236, 72, 153, 0.4)',
                          '0 0 0 10px rgba(236, 72, 153, 0)',
                        ]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        ease: 'easeOut' 
                      }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </motion.div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-semibold text-sm">
                        {isGroup ? 'Group convergence' : 'Crossing paths'}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {notification.prediction.friendName} • {formatTimeToMeet(notification.prediction.timeToMeet)}
                      </p>
                      
                      {/* Location */}
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {notification.prediction.predictedLocation.venueName || 'Nearby'}
                        </span>
                      </div>

                      {/* Confidence indicator */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-pink-500/60 to-violet-500/60"
                            initial={{ width: 0 }}
                            animate={{ width: `${notification.prediction.probability * 100}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground min-w-[30px] text-right">
                          {Math.round(notification.prediction.probability * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Close button */}
                    <button
                      onClick={() => handleDismiss(notification, false)}
                      className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                      aria-label="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleStartRally(notification)}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-pink-500 to-violet-500 rounded-xl text-white text-sm font-medium transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Start Rally
                    </button>
                    
                    <button
                      onClick={() => handleNavigate(notification)}
                      className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-xl text-foreground text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Go
                    </button>
                  </div>

                  {/* Suppress option for first notification */}
                  {index === 0 && activeNotifications.length > 1 && (
                    <button
                      onClick={() => handleDismiss(notification, true)}
                      className="w-full mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors text-center"
                    >
                      Pause notifications for {settings.cooldownPeriod / 1000}s
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Suppression indicator */}
      <AnimatePresence>
        {suppressedUntil > Date.now() && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[750] pointer-events-none"
            style={{ top: 'calc(16px + env(safe-area-inset-top))' }}
          >
            <div className="px-3 py-1.5 bg-background/80 backdrop-blur-xl rounded-full border border-border">
              <span className="text-xs text-muted-foreground">
                Notifications paused for {Math.ceil((suppressedUntil - Date.now()) / 1000)}s
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};