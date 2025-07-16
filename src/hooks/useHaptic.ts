import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import * as Haptics from 'expo-haptics';

export const useHaptic = () => {
  const triggerHaptic = useCallback(async (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (Capacitor.isNativePlatform()) {
      try {
        switch (type) {
          case 'light':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'heavy':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
        }
      } catch (error) {
        // Haptics not available on this device
        console.debug('Haptics not available:', error);
      }
    }
  }, []);

  return { triggerHaptic };
};