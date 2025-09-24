import { isWorkerFallback } from '@/lib/clusterWorker';

let modeLogged = false;

export function logWorkerModeOnce() {
  if (modeLogged) return;
  modeLogged = true;
  
  const mode = isWorkerFallback() ? 'fallback' : 'web-worker';
  console.log(`[Field] Worker mode: ${mode}`);
  
  if (mode === 'fallback') {
    console.warn('[Field] Using fallback mode - performance may be reduced');
  }
}