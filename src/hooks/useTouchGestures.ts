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
    onDrag: ({ direction: [dx], distance, cancel }) => {
      // Horizontal swipe detection
      if (distance[0] > swipeThreshold) {
        if (dx > 0 && onSwipeRight) {
          onSwipeRight();
          cancel();
        } else if (dx < 0 && onSwipeLeft) {
          onSwipeLeft();
          cancel();
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
      threshold: 10
    },
    pinch: { 
      threshold: 0.1
    }
  });

  return bind;
}