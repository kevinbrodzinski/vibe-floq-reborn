import { useCallback } from 'react';

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export function useHapticFeedback() {
  const triggerHaptic = useCallback((pattern: HapticPattern = 'light') => {
    // Check if haptic feedback is available
    if (!('vibrate' in navigator)) return;

    // Define vibration patterns
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [50],
      success: [10, 10, 20],
      warning: [20, 10, 20],
      error: [50, 30, 50],
    };

    try {
      navigator.vibrate(patterns[pattern]);
    } catch (error) {
      // Silently fail if vibration is not supported or fails
      console.debug('Haptic feedback not available:', error);
    }
  }, []);

  // Enhanced haptic feedback methods for various interaction types
  const tapFeedback = useCallback(() => triggerHaptic('light'), [triggerHaptic]);
  const successFeedback = useCallback(() => triggerHaptic('success'), [triggerHaptic]);
  const errorFeedback = useCallback(() => triggerHaptic('error'), [triggerHaptic]);
  const navigationFeedback = useCallback(() => triggerHaptic('medium'), [triggerHaptic]);
  
  // Create a socialHaptics object with specific methods for various social interactions
  const socialHaptics = {
    avatarInteraction: useCallback(() => triggerHaptic('light'), [triggerHaptic]),
    connectionMade: useCallback(() => triggerHaptic('success'), [triggerHaptic]),
    gestureConfirm: useCallback(() => triggerHaptic('medium'), [triggerHaptic]),
    longPressActivated: useCallback(() => triggerHaptic('heavy'), [triggerHaptic]),
    shakeActivated: useCallback(() => triggerHaptic('warning'), [triggerHaptic]),
    swipeSuccess: useCallback(() => triggerHaptic('success'), [triggerHaptic]),
    timeShift: useCallback(() => triggerHaptic('medium'), [triggerHaptic]),
    floqJoined: useCallback(() => triggerHaptic('success'), [triggerHaptic]),
    vibeMatch: useCallback(() => triggerHaptic('success'), [triggerHaptic]),
    crossedPathsDetected: useCallback(() => triggerHaptic('light'), [triggerHaptic]),
  };

  return {
    triggerHaptic,
    tapFeedback,
    successFeedback,
    errorFeedback,
    navigationFeedback,
    socialHaptics,
  };
}