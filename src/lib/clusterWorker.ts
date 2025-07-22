import * as Comlink from 'comlink';
import type { RawTile, Cluster } from '@/workers/clustering.worker';

export const clusterWorker = (() => {
  const worker = new Worker(
    new URL('../workers/clustering.worker?worker&url', import.meta.url),
    { type: 'module' },
  );
  return Comlink.wrap<{ cluster(tiles: RawTile[]): Promise<Cluster[]> }>(worker);
})();