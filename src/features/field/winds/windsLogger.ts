import { supabase } from '@/integrations/supabase/client';

type CellSample = {
  hour_bucket: number; dow: number; cell_x: number; cell_y: number; vx: number; vy: number; weight: number;
};

const GRID = 72;                   // coarse pixel grid; match P3B pressure grid
const BATCH_MAX = 120;             // safety cap
const FLUSH_MS  = 15_000;          // flush every 15s
let batch: CellSample[] = [];
let lastFlush = 0;

function quant(x:number){ return Math.round(x / GRID); }

export function startWindsLogger(opts: { enabled:boolean; getClusters:()=>Array<{x:number;y:number;vx:number;vy:number}>, cityId: string }) {
  if (!opts.enabled) return () => {};
  let alive = true;

  // Add pipeline health tracking
  let lastSuccessfulFlush = 0;
  let totalSamplesSent = 0;
  let flushAttempts = 0;

  const tick = async () => {
    if (!alive) return;
    const clusters = opts.getClusters();
    const now = new Date();
    const hb  = now.getHours();
    const dow = now.getDay();

    // Sample clusters into grid cells
    for (const c of clusters) {
      const gx = quant(c.x), gy = quant(c.y);
      if (!Number.isFinite(c.vx) || !Number.isFinite(c.vy)) continue;
      batch.push({ hour_bucket: hb, dow, cell_x: gx, cell_y: gy, vx: c.vx, vy: c.vy, weight: 1 });
    }

    // Flush policy
    const t = performance.now();
    if (batch.length >= BATCH_MAX || (t - lastFlush) > FLUSH_MS) {
      const payload = { cityId: opts.cityId, samples: batch.splice(0, BATCH_MAX) };
      lastFlush = t;
      flushAttempts++;
      
      // Enhanced logging for pipeline health
      if (import.meta.env.DEV) {
        console.log(`[windsLogger] Flushing ${payload.samples.length} samples for city ${payload.cityId}`, {
          totalClusters: clusters.length,
          batchSize: payload.samples.length,
          flushAttempt: flushAttempts
        });
      }
      
      // auth: user-JWT comes from supabase client automatically in invoke
      supabase.functions.invoke('log-flow-samples', { body: payload })
        .then((result) => {
          lastSuccessfulFlush = t;
          totalSamplesSent += payload.samples.length;
          if (import.meta.env.DEV) {
            console.log(`[windsLogger] Success: ${payload.samples.length} samples sent (total: ${totalSamplesSent})`);
          }
        })
        .catch(e => {
          if (import.meta.env.DEV) {
            console.warn('[windsLogger] flush failed:', e);
            console.warn('[windsLogger] Pipeline health check: last success was', 
              Math.round((t - lastSuccessfulFlush) / 1000), 'seconds ago');
          }
        });
    }
    // schedule next
    setTimeout(tick, 5_000);
  };

  tick();
  
  // Pipeline health monitoring (dev only)
  if (import.meta.env.DEV) {
    console.log('[windsLogger] Started for city:', opts.cityId);
    // Health check every 60 seconds in development
    const healthCheck = setInterval(() => {
      if (!alive) {
        clearInterval(healthCheck);
        return;
      }
      const timeSinceLastFlush = performance.now() - lastSuccessfulFlush;
      console.log('[windsLogger] Health check:', {
        samplesInBatch: batch.length,
        totalSamplesSent,
        flushAttempts,
        timeSinceLastSuccess: Math.round(timeSinceLastFlush / 1000) + 's',
        pipelineHealthy: timeSinceLastFlush < 120000 // 2 minutes threshold
      });
    }, 60000);
    
    return () => { 
      alive = false; 
      clearInterval(healthCheck);
    };
  }
  
  return () => { alive = false; };
}