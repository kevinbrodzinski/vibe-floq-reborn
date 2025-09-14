import { useState, useEffect } from 'react';
import { Brain, MapPin, Users, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LearningEvent {
  type: 'gps' | 'social' | 'temporal' | 'venue';
  message: string;
  timestamp: number;
  confidence?: number;
}

/**
 * Shows real-time feedback when patterns are being learned
 */
export function PatternLearningIndicator() {
  const [events, setEvents] = useState<LearningEvent[]>([]);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Listen for pattern learning events
    const handleLearningEvent = (event: CustomEvent<LearningEvent>) => {
      const newEvent = { ...event.detail, timestamp: Date.now() };
      setEvents(prev => [newEvent, ...prev.slice(0, 4)]); // Keep last 5 events
      setShowIndicator(true);
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setEvents(prev => prev.filter(e => e.timestamp !== newEvent.timestamp));
        if (events.length <= 1) {
          setShowIndicator(false);
        }
      }, 3000);
    };

    window.addEventListener('pattern-learning' as any, handleLearningEvent);
    return () => window.removeEventListener('pattern-learning' as any, handleLearningEvent);
  }, [events.length]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'gps': return MapPin;
      case 'social': return Users;
      case 'temporal': return Clock;
      case 'venue': return Brain;
      default: return Sparkles;
    }
  };

  if (!showIndicator || events.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 right-4 z-50 pointer-events-none"
    >
      <div className="bg-card/95 backdrop-blur-xl rounded-lg border border-border/30 p-3 min-w-[280px] shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-foreground">Learning from you</span>
        </div>
        
        <AnimatePresence mode="popLayout">
          {events.slice(0, 3).map((event) => {
            const Icon = getIcon(event.type);
            return (
              <motion.div
                key={event.timestamp}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 py-1 text-xs text-muted-foreground"
              >
                <Icon className="w-3 h-3 text-accent/70" />
                <span>{event.message}</span>
                {event.confidence && (
                  <span className="text-accent ml-auto">
                    {Math.round(event.confidence * 100)}%
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {events.length > 3 && (
          <div className="text-xs text-muted-foreground mt-1 opacity-60">
            +{events.length - 3} more patterns learned
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Utility to emit learning events
export const emitLearningEvent = (event: Omit<LearningEvent, 'timestamp'>) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pattern-learning', { detail: event }));
  }
};