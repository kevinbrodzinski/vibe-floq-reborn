// src/lib/field/pixiBridge.ts
import type mapboxgl from 'mapbox-gl';
import {
  getFieldOverlaySnapshot,
  subscribeFieldOverlay,
  type RawOverlayEntity,
} from '@/lib/field/overlayBridge';
import { createFieldPixiLayer, type FieldPoint } from '@/lib/map/customLayers/FieldPixiLayer';

// Supabase-generated types (DB enum source of truth)
import type { Database } from '@/integrations/supabase/types';
// UI vibe tokens → RGB triplets (0..255)
import { VIBE_RGB, type Vibe as UiVibe } from '@/lib/vibes';

export type PixiBridgeOptions = {
  layerId?: string;              // defaults to 'field-pixi'
  beforeId?: string | undefined; // optional: insert before label layer
  convert?: (rows: RawOverlayEntity[]) => FieldPoint[];
};

type DbVibe = Database['public']['Enums']['vibe_enum'];

/**
 * Attach the PIXI GL layer to the map AND bind it to the overlay bridge.
 * Returns a cleanup function.
 */
export function attachFieldPixiBridge(
  map: mapboxgl.Map,
  opts: PixiBridgeOptions = {}
): () => void {
  const layerId = opts.layerId ?? 'field-pixi';
  const convert = opts.convert ?? glPointsConvertDb;

  // Create + add layer if missing
  if (!map.getLayer(layerId)) {
    const layer = createFieldPixiLayer({ id: layerId });
    map.addLayer(layer as any, opts.beforeId);
    (map as any).__fieldPixi = layer;
  }

  const layer = (map as any).__fieldPixi as ReturnType<typeof createFieldPixiLayer> | undefined;
  if (!layer) return () => {};

  const push = () => {
    const snap = getFieldOverlaySnapshot();
    const pts = convert(snap);
    layer.setPoints(pts);
  };

  // Initial push
  push();

  // Subscribe to overlay changes
  const unsub = subscribeFieldOverlay(push);

  // Light refresh on map transforms (cheap)
  const refresh = () => push();
  map.on('move', refresh);
  map.on('zoom', refresh);
  map.on('rotate', refresh);

  return () => {
    unsub();
    map.off('move', refresh);
    map.off('zoom', refresh);
    map.off('rotate', refresh);

    const l = (map as any).__fieldPixi as (mapboxgl.CustomLayerInterface & { destroy?: () => void }) | undefined;
    if (l && map.getLayer(l.id)) {
      map.removeLayer(l.id);
      l.destroy?.();
    }
    (map as any).__fieldPixi = undefined;
  };
}

/**
 * Precise converter for the glPoints we publish from FieldSocialContext:
 * Input rows should look like:
 * { id: string; lat: number; lng: number; isFriend?: boolean; vibe?: DbVibe | string | null }
 */
export function glPointsConvertDb(rows: RawOverlayEntity[]): FieldPoint[] {
  const out: FieldPoint[] = [];

  for (const r of rows) {
    const id = getId(r);
    const lat = toNum(r.lat);
    const lng = toNum(r.lng);
    if (!id || !isFiniteNum(lat) || !isFiniteNum(lng)) continue;

    // Coerce to DB enum; fallback to 'social' if missing/unknown
    const vibe = safeDbVibe(r.vibe);
    const isFriend = Boolean(r.isFriend);

    // Intensity & color
    const intensity = computeIntensityDb(isFriend, vibe);
    const color = colorForDbVibe(vibe);

    out.push({ id, lat, lng, intensity, color });
  }
  return out;
}

/* ------------------------- vibe helpers (DB-typed) ------------------------ */

const DB_VIBES: readonly DbVibe[] = [
  'chill',
  'hype',
  'curious',
  'social',
  'solo',
  'romantic',
  'weird',
  'down',
  'flowing',
  'open',
  'energetic',
  'excited',
  'focused',
] as const;

/** Runtime-safe guard to DB enum */
function isDbVibe(x: unknown): x is DbVibe {
  return typeof x === 'string' && (DB_VIBES as readonly string[]).includes(x);
}

/** Safe coercion from unknown → DbVibe with a sensible default */
function safeDbVibe(x: unknown): DbVibe {
  if (isDbVibe(x)) return x;
  return 'social';
}

/** Map DB enum → UI vibe (your UI set has 10 values; map extras to closest) */
function toUiVibe(v: DbVibe): UiVibe {
  switch (v) {
    case 'energetic':
    case 'excited':
    case 'hype':
      return 'hype';
    case 'focused':
      return 'solo';     // closest UX feel to "heads-down"
    case 'chill':
      return 'chill';
    case 'curious':
      return 'curious';
    case 'social':
      return 'social';
    case 'solo':
      return 'solo';
    case 'romantic':
      return 'romantic';
    case 'weird':
      return 'weird';
    case 'down':
      return 'down';
    case 'flowing':
      return 'flowing';
    case 'open':
      return 'open';
    default:
      return 'social';
  }
}

/** Typed base intensity per DB vibe */
const VIBE_INTENSITY_BASE_DB: Record<DbVibe, number> = {
  chill:     0.85,
  hype:      1.00,
  curious:   0.95,
  social:    1.00,
  solo:      0.80,
  romantic:  0.90,
  weird:     0.95,
  down:      0.60,
  flowing:   0.90,
  open:      0.90,
  energetic: 1.00, // alias to hype-ish
  excited:   0.98,
  focused:   0.85,
};

function computeIntensityDb(isFriend: boolean, vibe: DbVibe): number {
  const base = VIBE_INTENSITY_BASE_DB[vibe] ?? 0.9;
  const friendBoost = isFriend ? 1.05 : 1.0;
  return clamp(base * friendBoost, 0.1, 1);
}

/** Use UI tokens for color: DB vibe → UI vibe → VIBE_RGB → PIXI color */
function colorForDbVibe(v: DbVibe): number {
  const ui: UiVibe = toUiVibe(v);
  const [r, g, b] = VIBE_RGB[ui];         // [0..255, 0..255, 0..255]
  return (r << 16) | (g << 8) | b;        // 0xRRGGBB
}

/* ------------------------------ misc helpers ------------------------------ */

function getId(r: any): string | undefined {
  const v = r?.id ?? r?.profile_id ?? r?.user_id ?? r?.key;
  return typeof v === 'string' && v ? v : undefined;
}
function toNum(v: any): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}
function isFiniteNum(n: any): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}