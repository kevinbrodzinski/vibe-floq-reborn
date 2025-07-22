import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimerId } from '@/types/Timer';
import type { TouchEvent as ReactTouchEvent } from 'react';

export type GestureType = 
  | 'swipe-left' 
  | 'swipe-right' 
  | 'swipe-up' 
  | 'swipe-down'
  | 'long-press'
  | 'shake'
  | 'pinch'
  | 'two-finger-tap'
  | 'three-finger-tap'
  | 'drag'
  | 'orbital';

export interface GestureEvent {
  type: GestureType;
  element?: HTMLElement;
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  duration?: number;
  intensity?: number;
}

export interface UseAdvancedGesturesProps {
  onGesture?: (gesture: GestureEvent) => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTap?: () => void;
  longPressDelay?: number;
  swipeThreshold?: number;
  shakeThreshold?: number;
}

export const useAdvancedGestures = ({
  onGesture,
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  longPressDelay = 500,
  swipeThreshold = 50,
  shakeThreshold = 15
}: UseAdvancedGesturesProps = {}) => {
  const [isListening, setIsListening] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<TimerId | null>(null);
  const shakeDetectionRef = useRef<{ lastX: number; lastY: number; lastZ: number; shakeCount: number }>({
    lastX: 0, lastY: 0, lastZ: 0, shakeCount: 0
  });

  const handleGesture = useCallback((gesture: GestureEvent) => {
    onGesture?.(gesture);
    
    // Call specific callbacks
    switch (gesture.type) {
      case 'swipe-up':
        onSwipeUp?.();
        break;
      case 'swipe-down':
        onSwipeDown?.();
        break;
      case 'swipe-left':
        onSwipeLeft?.();
        break;
      case 'swipe-right':
        onSwipeRight?.();
        break;
    }
  }, [onGesture, onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight]);

  // React touch event handlers
  const handleReactTouchStart = useCallback((e: ReactTouchEvent) => {
    const touch = e.touches[0];
    const target = e.currentTarget as HTMLElement;
    
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    // Multi-touch gestures
    if (e.touches.length === 2) {
      handleGesture({ type: 'two-finger-tap', element: target });
    } else if (e.touches.length === 3) {
      handleGesture({ type: 'three-finger-tap', element: target });
    }

    // Long press detection
    longPressTimerRef.current = setTimeout(() => {
      if (touchStartRef.current) {
        handleGesture({
          type: 'long-press',
          element: target,
          startPoint: { x: touchStartRef.current.x, y: touchStartRef.current.y },
          duration: Date.now() - touchStartRef.current.time
        });
      }
    }, longPressDelay);
  }, [handleGesture, longPressDelay]);

  const handleReactTouchMove = useCallback((e: ReactTouchEvent) => {
    // Clear long press if moving
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleReactTouchEnd = useCallback((e: ReactTouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const duration = Date.now() - touchStartRef.current.time;
    const target = e.currentTarget as HTMLElement;

    // Swipe detection
    if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
      let swipeType: GestureType;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        swipeType = deltaX > 0 ? 'swipe-right' : 'swipe-left';
      } else {
        swipeType = deltaY > 0 ? 'swipe-down' : 'swipe-up';
      }

      handleGesture({
        type: swipeType,
        element: target,
        startPoint: { x: touchStartRef.current.x, y: touchStartRef.current.y },
        endPoint: { x: touch.clientX, y: touch.clientY },
        duration,
        intensity: Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      });
    } else if (duration < 300) {
      // Tap detection - quick touch without significant movement
      onTap?.();
    }

    touchStartRef.current = null;
  }, [handleGesture, swipeThreshold, onTap]);

  // Native touch event handlers for global listening
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    // Clear long press if moving
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    touchStartRef.current = null;
  }, []);

  // Device motion for shake detection
  const handleDeviceMotion = useCallback((e: DeviceMotionEvent) => {
    if (!e.accelerationIncludingGravity) return;

    const { x = 0, y = 0, z = 0 } = e.accelerationIncludingGravity;
    const { lastX, lastY, lastZ } = shakeDetectionRef.current;

    const deltaX = Math.abs(x - lastX);
    const deltaY = Math.abs(y - lastY);
    const deltaZ = Math.abs(z - lastZ);

    if (deltaX + deltaY + deltaZ > shakeThreshold) {
      shakeDetectionRef.current.shakeCount++;
      
      if (shakeDetectionRef.current.shakeCount > 3) {
        handleGesture({
          type: 'shake',
          intensity: deltaX + deltaY + deltaZ
        });
        shakeDetectionRef.current.shakeCount = 0;
      }
    }

    shakeDetectionRef.current = { lastX: x, lastY: y, lastZ: z, shakeCount: shakeDetectionRef.current.shakeCount };
  }, [handleGesture, shakeThreshold]);

  const startListening = useCallback(() => {
    if (isListening) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Request device motion permission for shake detection
    if (typeof DeviceMotionEvent !== 'undefined' && 'requestPermission' in DeviceMotionEvent) {
      (DeviceMotionEvent as any).requestPermission().then((response: string) => {
        if (response === 'granted') {
          window.addEventListener('devicemotion', handleDeviceMotion);
        }
      });
    } else {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    setIsListening(true);
  }, [isListening, handleTouchStart, handleTouchMove, handleTouchEnd, handleDeviceMotion]);

  const stopListening = useCallback(() => {
    if (!isListening) return;

    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('devicemotion', handleDeviceMotion);

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    setIsListening(false);
  }, [isListening, handleTouchStart, handleTouchMove, handleTouchEnd, handleDeviceMotion]);

  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  // Separate DOM-safe handlers from control methods
  const handlers = {
    onTouchStart: handleReactTouchStart,
    onTouchMove: handleReactTouchMove,
    onTouchEnd: handleReactTouchEnd
  };

  const controls = {
    isListening,
    startListening,
    stopListening
  };

  return {
    handlers,
    controls,
    // Legacy API for backward compatibility
    isListening,
    startListening,
    stopListening,
    onTouchStart: handleReactTouchStart,
    onTouchMove: handleReactTouchMove,
    onTouchEnd: handleReactTouchEnd
  };
};