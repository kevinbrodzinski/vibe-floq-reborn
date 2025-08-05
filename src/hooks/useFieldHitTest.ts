import { useCallback, useRef } from 'react';
import { clusterWorker } from '@/lib/clusterWorker';

/** throttled helper so we don't flood the worker */
const HIT_FPS = 30;
const MIN_DT = 1000 / HIT_FPS;

export const useFieldHitTest = () => {
  const last = useRef(0);

  return useCallback(async (x: number, y: number, radius = 12): Promise<string[]> => {
    const now = performance.now();
    if (now - last.current < MIN_DT) return [];   // ~30 fps throttle
    last.current = now;

    try {
      return await clusterWorker.call('hitTest', x, y, radius);
    } catch {
      return [];
    }
  }, []);
};