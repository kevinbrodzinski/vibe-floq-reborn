import { useEffect } from 'react';
import { useGesture } from '@use-gesture/react';
import { motion } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface MobileGestureEnhancementsProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function MobileGestureEnhancements({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onLongPress,
  onDoubleTap,
  children,
  className = ''
}: MobileGestureEnhancementsProps) {
  const { socialHaptics } = useHapticFeedback();

  const bind = useGesture({
    onDrag: ({ direction, velocity, distance, cancel }) => {
      const [dx, dy] = direction;
      const [vx, vy] = velocity;
      
      // Require minimum distance and velocity for swipe detection
      if (distance[0] > 100 && (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5)) {
        // Determine primary direction
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal swipe
          if (dx > 0 && onSwipeRight) {
            socialHaptics.swipeSuccess();
            onSwipeRight();
            cancel();
          } else if (dx < 0 && onSwipeLeft) {
            socialHaptics.swipeSuccess();
            onSwipeLeft();
            cancel();
          }
        } else {
          // Vertical swipe
          if (dy > 0 && onSwipeDown) {
            socialHaptics.swipeSuccess();
            onSwipeDown();
            cancel();
          } else if (dy < 0 && onSwipeUp) {
            socialHaptics.swipeSuccess();
            onSwipeUp();
            cancel();
          }
        }
      }
    },
    onMove: ({ pressed, timeStamp, initial }) => {
      // Long press detection
      if (pressed && onLongPress && timeStamp - initial[0] > 800) {
        socialHaptics.longPressActivated();
        onLongPress();
      }
    }
  }, {
    drag: {
      threshold: 10,
      filterTaps: true
    }
  });

  return (
    <div {...bind()} className={`touch-none ${className}`}>
      <motion.div 
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </div>
  );
}

// Specialized gesture wrapper for plan execution
export function ExecutionGestureWrapper({
  onNextStop,
  onPreviousStop,
  onQuickCheckIn,
  onShowSummary,
  children
}: {
  onNextStop?: () => void;
  onPreviousStop?: () => void;
  onQuickCheckIn?: () => void;
  onShowSummary?: () => void;
  children: React.ReactNode;
}) {
  return (
    <MobileGestureEnhancements
      onSwipeLeft={onNextStop}
      onSwipeRight={onPreviousStop}
      onSwipeUp={onShowSummary}
      onDoubleTap={onQuickCheckIn}
      className="h-full w-full"
    >
      {children}
    </MobileGestureEnhancements>
  );
}