import { useCallback, useState } from 'react';
import type { ViewportBounds } from '../../packages/ui/src/maps/types';

export const useFieldViewport = () => {
  const [, setBounds] = useState<ViewportBounds | null>(null);

  const onRegionChange = useCallback((bounds: ViewportBounds) => {
    setBounds(bounds);           // keeps state in case other hooks need it soon
    console.debug('Field viewport changed:', bounds);
  }, []);

  return { onRegionChange };
};