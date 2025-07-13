import { useEffect, useCallback, useRef } from 'react';
import { useHapticFeedback } from './useHapticFeedback';

interface ShakeDetectionOptions {
  sensitivity?: number;
  onShake?: () => void;
  onLongPress?: () => void;
  onMultiTouch?: (touches: number) => void;
  enabled?: boolean;
}

interface MotionData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export const useShakeDetection = ({
  sensitivity = 15,
  onShake,
  onLongPress,
  onMultiTouch,
  enabled = true
}: ShakeDetectionOptions = {}) => {
  const { socialHaptics } = useHapticFeedback();
  const motionBuffer = useRef<MotionData[]>([]);
  const lastShakeTime = useRef(0);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const touchStartTime = useRef(0);

  // Shake detection using device motion
  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    if (!enabled || !event.accelerationIncludingGravity) return;

    const { x, y, z } = event.accelerationIncludingGravity;
    const timestamp = Date.now();
    
    if (x !== null && y !== null && z !== null) {
      const motionData: MotionData = { x, y, z, timestamp };
      motionBuffer.current.push(motionData);

      // Keep only recent motion data (last 500ms)
      motionBuffer.current = motionBuffer.current.filter(
        data => timestamp - data.timestamp < 500
      );

      // Calculate motion intensity
      if (motionBuffer.current.length > 5) {
        const recent = motionBuffer.current.slice(-5);
        const avgX = recent.reduce((sum, d) => sum + Math.abs(d.x), 0) / recent.length;
        const avgY = recent.reduce((sum, d) => sum + Math.abs(d.y), 0) / recent.length;
        const avgZ = recent.reduce((sum, d) => sum + Math.abs(d.z), 0) / recent.length;
        
        const intensity = Math.sqrt(avgX * avgX + avgY * avgY + avgZ * avgZ);

        // Detect shake gesture
        if (intensity > sensitivity && timestamp - lastShakeTime.current > 1000) {
          lastShakeTime.current = timestamp;
          socialHaptics.shakeActivated();
          onShake?.();
        }
      }
    }
  }, [enabled, sensitivity, onShake, socialHaptics]);

  // Touch gesture detection
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!enabled) return;

    touchStartTime.current = Date.now();
    const touches = event.touches.length;

    // Multi-touch detection
    if (touches > 1) {
      onMultiTouch?.(touches);
      socialHaptics.gestureConfirm();
    }

    // Long press detection
    if (touches === 1) {
      longPressTimer.current = setTimeout(() => {
        socialHaptics.longPressActivated();
        onLongPress?.();
      }, 800);
    }
  }, [enabled, onMultiTouch, onLongPress, socialHaptics]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  }, []);

  // Request permission for motion events on iOS
  const requestMotionPermission = useCallback(async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && 
        typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.warn('Failed to request motion permission:', error);
        return false;
      }
    }
    return true; // Permission not needed or already granted
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!enabled) return;

    // Request permission and setup motion detection
    requestMotionPermission().then(granted => {
      if (granted) {
        window.addEventListener('devicemotion', handleDeviceMotion);
      }
    });

    // Setup touch detection
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, [enabled, handleDeviceMotion, handleTouchStart, handleTouchEnd, requestMotionPermission]);

  return {
    requestMotionPermission,
    isMotionAvailable: typeof DeviceMotionEvent !== 'undefined'
  };
};
