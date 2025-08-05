import { useCallback, useState } from 'react';
import type { Bounds as ViewportBounds } from '@/types/maps';

export const useFieldViewport = () => {
  const [bounds, setBounds] = useState<ViewportBounds | null>(null);

  const onRegionChange = useCallback((bounds: ViewportBounds) => {
    setBounds(bounds);
    console.debug('Field viewport changed:', bounds);
  }, []);

  return { bounds, onRegionChange };
};