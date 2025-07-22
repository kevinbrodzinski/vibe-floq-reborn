import * as Comlink from 'comlink';
import type { RawTile, Cluster } from '@/workers/clustering.worker';

const worker = new Worker(
  new URL('../workers/clustering.worker.ts', import.meta.url),
  { type: 'module' },
);

export const clusterWorker = Comlink.wrap<{
  cluster(tiles: RawTile[]): Promise<Cluster[]>;
}>(worker);