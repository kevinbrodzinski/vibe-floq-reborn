import { useCallback } from 'react';

export type HapticPattern = 
  | 'light' 
  | 'medium' 
  | 'heavy'
  | 'selection'
  | 'impact-light'
  | 'impact-medium'
  | 'impact-heavy'
  | 'social-connection'
  | 'social-proximity'
  | 'time-transition'
  | 'gesture-success'
  | 'gesture-error'
  | 'crossed-paths';

export interface HapticOptions {
  duration?: number;
  intensity?: number;
  pattern?: number[];
}

export const useHapticFeedback = () => {
  const isHapticSupported = useCallback(() => {
    return 'vibrate' in navigator || 'hapticActuators' in navigator;
  }, []);

  const triggerHaptic = useCallback((pattern: HapticPattern, options?: HapticOptions) => {
    if (!isHapticSupported()) return;

    const defaultOptions: HapticOptions = {
      duration: 50,
      intensity: 0.5,
      pattern: [50]
    };

    const hapticOptions = { ...defaultOptions, ...options };

    // Pattern mapping for different haptic types
    const getHapticPattern = (type: HapticPattern): number[] => {
      switch (type) {
        case 'light':
          return [25];
        case 'medium':
          return [50];
        case 'heavy':
          return [100];
        case 'selection':
          return [10];
        case 'impact-light':
          return [30];
        case 'impact-medium':
          return [60];
        case 'impact-heavy':
          return [120];
        case 'social-connection':
          return [50, 50, 100]; // Double tap + hold
        case 'social-proximity':
          return [25, 25, 25]; // Gentle pulse pattern
        case 'time-transition':
          return [30, 30, 30, 100]; // Building crescendo
        case 'gesture-success':
          return [25, 25, 50]; // Success confirmation
        case 'gesture-error':
          return [100, 50, 100]; // Error indication
        case 'crossed-paths':
          return [30, 50, 60]; // Discovery pulse pattern
        default:
          return hapticOptions.pattern || [50];
      }
    };

    const vibrationPattern = getHapticPattern(pattern);

    // Use Web Vibration API (only if available and on mobile)
    if ('vibrate' in navigator && navigator.vibrate) {
      navigator.vibrate(vibrationPattern);
    }

    // Future: Web Haptics API when available
    if ('hapticActuators' in navigator) {
      // @ts-ignore - Future API
      navigator.hapticActuators?.forEach((actuator: any) => {
        actuator.pulse?.(hapticOptions.intensity, hapticOptions.duration);
      });
    }
  }, [isHapticSupported]);

  // Social-specific haptic patterns
  const socialHaptics = {
    friendNearby: () => triggerHaptic('social-proximity'),
    connectionMade: () => triggerHaptic('social-connection'),
    floqJoined: () => triggerHaptic('impact-medium'),
    vibeMatch: () => triggerHaptic('gesture-success'),
    gestureConfirm: () => triggerHaptic('selection'),
    timeShift: () => triggerHaptic('time-transition'),
    shakeActivated: () => triggerHaptic('impact-heavy'),
    swipeSuccess: () => triggerHaptic('gesture-success'),
    longPressActivated: () => triggerHaptic('medium'),
    avatarInteraction: () => triggerHaptic('light'),
    crossedPathsDetected: () => triggerHaptic('crossed-paths')
  };

  // Additional feedback methods for backward compatibility
  const tapFeedback = useCallback(() => triggerHaptic('light'), [triggerHaptic]);
  const successFeedback = useCallback(() => triggerHaptic('gesture-success'), [triggerHaptic]);
  const errorFeedback = useCallback(() => triggerHaptic('gesture-error'), [triggerHaptic]);
  const navigationFeedback = useCallback(() => triggerHaptic('medium'), [triggerHaptic]);

  return {
    isHapticSupported,
    triggerHaptic,
    tapFeedback,
    successFeedback,
    errorFeedback,
    navigationFeedback,
    socialHaptics
  };
};