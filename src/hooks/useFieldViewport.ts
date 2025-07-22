import { useCallback, useState } from 'react';
import type { ViewportBounds } from '../../packages/ui/src/maps/types';

export const useFieldViewport = () => {
  const [bounds, setBounds] = useState<ViewportBounds | null>(null);

  const onRegionChange = useCallback((bounds: ViewportBounds) => {
    setBounds(bounds);
    console.debug('Field viewport changed:', bounds);
  }, []);

  return { bounds, onRegionChange };
};