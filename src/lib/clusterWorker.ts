import * as Comlink from 'comlink';
import type { RawTile, Cluster } from '@/workers/clustering.worker';

/**
 * Singleton / HMR-safe worker wrapper.
 * Re-uses the same Worker instance across page navigations
 * and terminates it cleanly on hot-reload.
 */
const workerSingleton = (() => {
  const g = globalThis as any;
  const key = '__clusterWorker';

  if (g[key]) return g[key] as Worker;

const w = new Worker(
    new URL('../workers/clustering.worker.ts', import.meta.url),
    { type: 'module' },
  );

  if (import.meta.hot) {
    import.meta.hot.dispose(() => w.terminate());
  }

  g[key] = w;
  return w;
})();

export const clusterWorker = Comlink.wrap<{
  cluster (tiles: RawTile[], zoom?: number): Promise<Cluster[]>;
  hitTest (x: number, y: number, radius?: number): Promise<string[]>;
}>(workerSingleton);