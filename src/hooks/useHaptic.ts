import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const useHaptic = () => {
  const triggerHaptic = useCallback(async (type: 'light' | 'medium' | 'heavy' = 'light') => {
    // Only trigger haptics on native platforms
    if (Capacitor.isNativePlatform()) {
      try {
        let impactStyle: ImpactStyle;
        switch (type) {
          case 'light':
            impactStyle = ImpactStyle.Light;
            break;
          case 'medium':
            impactStyle = ImpactStyle.Medium;
            break;
          case 'heavy':
            impactStyle = ImpactStyle.Heavy;
            break;
          default:
            impactStyle = ImpactStyle.Light;
        }
        
        await Haptics.impact({ style: impactStyle });
      } catch (error) {
        // Haptics not available on this device
        console.debug('Haptics not available:', error);
      }
    }
  }, []);

  return { triggerHaptic };
};