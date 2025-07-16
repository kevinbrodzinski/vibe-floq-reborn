import { useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const useHaptic = () => {
  const isAvailableRef = useRef<boolean | null>(null);

  const triggerHaptic = useCallback(async (type: 'light' | 'medium' | 'heavy' = 'light') => {
    // Check haptics availability (cache result)
    if (isAvailableRef.current === null) {
      try {
        if (Capacitor.isNativePlatform()) {
          // For Capacitor, assume haptics are available if we're on native platform
          isAvailableRef.current = true;
        } else {
          isAvailableRef.current = false;
        }
      } catch {
        isAvailableRef.current = false;
      }
    }

    if (!isAvailableRef.current) return;

    // Queue haptics to avoid blocking UI thread
    queueMicrotask(async () => {
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
        console.debug('Haptics not available:', error);
      }
    });
  }, []);

  return { triggerHaptic };
};