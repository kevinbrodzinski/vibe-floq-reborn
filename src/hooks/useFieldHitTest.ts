import { useCallback, useRef } from 'react';
import { clusterWorker } from '@/lib/clusterWorker';

/** 30 fps-ish throttled hit-test helper */
export const useFieldHitTest = () => {
  const last = useRef(0);

  return useCallback(
    async (x: number, y: number, radius = 12): Promise<string[]> => {
      const now = performance.now();
      if (now - last.current < 33) return [];      // throttle
      last.current = now;

      try {
        return await clusterWorker.hitTest(x, y, radius);
      } catch {
        return [];
      }
    },
    [],
  );
};