import { useCallback } from 'react';
import { useGesture } from '@use-gesture/react';

interface TouchGesturesOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPinch?: (scale: number) => void;
  onTap?: () => void;
  onLongPress?: () => void;
  swipeThreshold?: number;
  pinchThreshold?: number;
}

export function useTouchGestures(options: TouchGesturesOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onPinch,
    onTap,
    onLongPress,
    swipeThreshold = 50,
    pinchThreshold = 0.2
  } = options;

  const bind = useGesture({
    onDrag: ({ direction: [dx], distance, velocity, active }) => {
      // Only trigger on deliberate fast swipes, not during scrolling
      if (!active && distance[0] > swipeThreshold && Math.abs(velocity[0]) > 0.5) {
        if (dx > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (dx < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }
    },
    onPinch: ({ offset: [scale] }) => {
      if (Math.abs(scale - 1) > pinchThreshold && onPinch) {
        onPinch(scale);
      }
    },
    onClick: () => {
      if (onTap) {
        onTap();
      }
    }
  }, {
    drag: { 
      axis: 'x',
      threshold: 20,
      filterTaps: true,
      preventDefaultCondition: () => false // Allow native scrolling
    },
    pinch: { 
      threshold: 0.1
    }
  });

  return bind;
}