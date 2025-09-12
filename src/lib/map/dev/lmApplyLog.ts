import type { LayerManager } from '@/lib/map/LayerManager';

type Opts = { thresholdBytes?: number; logSkipped?: boolean };

/** Attach a tiny console logger for large apply() payloads; returns unsubscribe */
export function attachLmApplyLog(lm: LayerManager, opts: Opts = {}) {
  const { thresholdBytes = 200_000, logSkipped = false } = opts;
  return lm.onApply(({ id, bytes, dt, skipped, features }) => {
    if (skipped && !logSkipped) return;
    if (bytes >= thresholdBytes || skipped) {
      // eslint-disable-next-line no-console
      console.log(`[LayerManager] ${id} ${skipped ? 'skipped' : 'applied'} • ${bytes.toLocaleString()}B • ${features}f • ${dt}ms`);
    }
  });
}