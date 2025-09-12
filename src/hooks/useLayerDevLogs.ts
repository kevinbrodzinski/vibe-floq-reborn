import { useEffect } from 'react';
import { layerManager } from '@/lib/map/LayerManager';

/**
 * Dev hook to enable console logging of LayerManager apply events
 * Only logs when enabled and for significant payloads
 */
export function useLayerDevLogs(enabled = false, options = { thresholdBytes: 200_000, logSkipped: false }) {
  useEffect(() => {
    if (!enabled) return;
    
    return layerManager.onApply(({ id, bytes, features, dt, skipped }) => {
      if (skipped && !options.logSkipped) return;
      if (bytes >= options.thresholdBytes || skipped) {
        // eslint-disable-next-line no-console
        console.log(`[LM] ${id} ${skipped ? 'skip' : 'apply'} • ${bytes.toLocaleString()}B • ${features}f • ${dt}ms`);
      }
    });
  }, [enabled, options.thresholdBytes, options.logSkipped]);
}