import { supabase } from '@/integrations/supabase/client';
import type { PixelBBox, PixelPoint, WindPath } from '@/lib/field/types';
import { P4 } from '@/lib/field/constants';

type TradeWindRow = {
  path_id: string;
  points: Array<{ x: number; y: number }>; // stored by STEP-3 refresh
  strength: number;
  avg_speed: number;
  support: number;
};

function pathHitsBBox(pts: PixelPoint[], bbox: PixelBBox) {
  for (const p of pts) {
    if (p.x >= bbox.xMin && p.x <= bbox.xMax && p.y >= bbox.yMin && p.y <= bbox.yMax) return true;
  }
  return false;
}

/** Fetch precomputed winds and clip to current viewport. */
export async function fetchTradeWindsForViewport(params: {
  cityId: string;
  hour: number;
  dow: number;
  bbox: PixelBBox;
  cap?: number;           // default P4.WINDS.MAX_PATHS
}): Promise<WindPath[]> {
  const { cityId, hour, dow, bbox, cap = P4.WINDS.MAX_PATHS } = params;

  // Fetch a bit more than cap to allow clipping to cull off-screen paths.
  const overFetch = cap * 2;
  const { data, error } = await supabase
    .from('trade_winds')
    .select('path_id, points, strength, avg_speed, support')
    .eq('city_id', cityId)
    .eq('hour_bucket', hour)
    .eq('dow', dow)
    .order('strength', { ascending: false })
    .limit(overFetch);

  if (error) {
    if (import.meta.env.DEV) console.warn('[winds] select trade_winds failed:', error);
    return [];
  }

  const rows = (data ?? []) as TradeWindRow[];

  const paths: WindPath[] = [];
  for (const r of rows) {
    // cheap viewport clip
    if (!pathHitsBBox(r.points, bbox)) continue;
    paths.push({
      id: r.path_id,
      pts: r.points,               // already in pixel space from STEP-3
      strength: Math.max(0, Math.min(1, r.strength)),
      avgSpeed: r.avg_speed,
      support: Math.max(0, Math.min(1, r.support)),
    });
    if (paths.length >= cap) break;
  }

  return paths;
}

// Utility functions
export const hourBucket = (d: Date) => d.getHours();

export function currentPixelBBox(renderer: { width: number; height: number }): PixelBBox {
  return { 
    xMin: 0, 
    yMin: 0, 
    xMax: renderer.width, 
    yMax: renderer.height 
  };
}

/** Call this once to seed trade winds data (development only) */
export async function seedTradeWindsIfEmpty() {
  if (!import.meta.env.DEV) return;
  
  const { data, error } = await supabase.from('trade_winds').select('id').limit(1);
  if (error || (data && data.length > 0)) return; // Already has data or error
  
  console.log('[winds] Seeding trade winds with sample data...');
  try {
    await supabase.rpc('refresh_trade_winds_all');
  } catch (e) {
    console.warn('[winds] Failed to seed trade winds:', e);
  }
}