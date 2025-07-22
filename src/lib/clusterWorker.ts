import * as Comlink from 'comlink';
import type { RawTile, Cluster } from '@/workers/clustering.worker';

export const clusterWorker = (() => {
  /* Vite / bundler creates a dedicated module worker */
  const worker = new Worker(
    new URL('../workers/clustering.worker?worker&url', import.meta.url),
    { type: 'module' },
  );

  return Comlink.wrap<{
    cluster (tiles: RawTile[], zoom?: number): Promise<Cluster[]>;
    hitTest (x: number, y: number, radius?: number): Promise<string[]>;
  }>(worker);
})();