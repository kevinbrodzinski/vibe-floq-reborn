
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Users, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { zIndex } from '@/constants/z';

interface PulseEvent {
  id: string;
  type: 'like' | 'message' | 'join' | 'vibe';
  username: string;
  avatar?: string;
  timestamp: number;
  position: { x: number; y: number };
  intensity?: number;
}

interface SocialPulseOverlayProps {
  events?: PulseEvent[];
  maxVisible?: number;
  pulseRadius?: number;
  className?: string;
}

const PULSE_DURATION = 3000; // 3 seconds
const ICON_MAP = {
  like: Heart,
  message: MessageCircle,
  join: Users,
  vibe: Sparkles,
} as const;

const COLOR_MAP = {
  like: 'text-red-500',
  message: 'text-blue-500',
  join: 'text-green-500',
  vibe: 'text-purple-500',
} as const;

export const SocialPulseOverlay: React.FC<SocialPulseOverlayProps> = ({
  events = [],
  maxVisible = 5,
  pulseRadius = 60,
  className = ""
}) => {
  // Early return if no events - prevents any state updates
  if (!events || events.length === 0) {
    return null;
  }

  const [visibleEvents, setVisibleEvents] = useState<PulseEvent[]>([]);

  // Stable reference to prevent infinite loops
  const eventsJson = JSON.stringify(events.map(e => ({ id: e.id, timestamp: e.timestamp })));

  useEffect(() => {
    const now = Date.now();
    const filtered = events
      .filter(event => now - event.timestamp < PULSE_DURATION)
      .slice(-maxVisible);
    
    setVisibleEvents(filtered);
  }, [eventsJson, maxVisible]);

  return (
    <div 
      {...zIndex('overlay')}
      className={`fixed inset-0 pointer-events-none ${className}`}
    >
      <AnimatePresence>
        {visibleEvents.map((event) => {
          const IconComponent = ICON_MAP[event.type];
          const colorClass = COLOR_MAP[event.type];
          const age = Date.now() - event.timestamp;
          const progress = age / PULSE_DURATION;

          return (
            <motion.div
              key={event.id}
              initial={{ 
                scale: 0, 
                opacity: 0,
                x: event.position.x,
                y: event.position.y
              }}
              animate={{ 
                scale: [0, 1.2, 1],
                opacity: [0, 1, 1 - progress],
                x: event.position.x,
                y: event.position.y
              }}
              exit={{ 
                scale: 0, 
                opacity: 0 
              }}
              transition={{
                duration: 0.8,
                ease: "easeOut"
              }}
              className="absolute pointer-events-none"
              style={{
                transform: `translate(-50%, -50%)`
              }}
            >
              {/* Ripple effect */}
              <motion.div
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ 
                  scale: progress * 3 + 1,
                  opacity: 0.8 - progress * 0.8
                }}
                className={`absolute inset-0 rounded-full border-2 ${colorClass.replace('text-', 'border-')}`}
                style={{
                  width: pulseRadius,
                  height: pulseRadius,
                  marginLeft: -pulseRadius / 2,
                  marginTop: -pulseRadius / 2,
                }}
              />

              {/* Main pulse */}
              <motion.div
                className={`relative bg-background/90 backdrop-blur-sm rounded-full p-3 border shadow-lg`}
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <IconComponent className={`h-6 w-6 ${colorClass}`} />
              </motion.div>

              {/* User badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: 0.3 }}
                className="absolute -bottom-8 left-1/2 -translate-x-1/2"
              >
                <Badge variant="secondary" className="text-xs px-2 py-1">
                  {event.username}
                </Badge>
              </motion.div>

              {/* Intensity indicator */}
              {event.intensity && event.intensity > 1 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
                >
                  {event.intensity}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
