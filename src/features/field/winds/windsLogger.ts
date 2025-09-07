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
      // auth: user-JWT comes from supabase client automatically in invoke
      supabase.functions.invoke('log-flow-samples', { body: payload })
        .catch(e => import.meta.env.DEV && console.warn('[windsLogger] flush failed', e));
    }
    // schedule next
    setTimeout(tick, 5_000);
  };

  tick();
  return () => { alive = false; };
}