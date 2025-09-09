import { useMemo, useState } from 'react';

export interface GestureEvent {
  type: string;
  data?: any;
  intensity?: number;
  duration?: number;
}

interface UseAdvancedGesturesOptions {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  onGesture?: (event: GestureEvent) => void;
  longPressDelay?: number;
  swipeThreshold?: number;
  shakeThreshold?: number;
}

export function useAdvancedGestures(options: UseAdvancedGesturesOptions) {
  const [isListening, setIsListening] = useState(false);

  const handlers = useMemo(() => ({
    onClick: options.onTap,
    onPointerUp: options.onSwipeUp,
  }), [options.onTap, options.onSwipeUp]);

  const controls = useMemo(() => ({
    enable: () => setIsListening(true),
    disable: () => setIsListening(false),
    startListening: () => setIsListening(true),
    stopListening: () => setIsListening(false),
    isListening,
  }), [isListening]);

  return { handlers, controls };
}