// src/lib/field/pixiBridge.ts
import type mapboxgl from 'mapbox-gl';
import {
  getFieldOverlaySnapshot,
  subscribeFieldOverlay,
  type RawOverlayEntity,
} from '@/lib/field/overlayBridge';
import {
  createFieldPixiLayer,
  type FieldPoint,
  type FieldPixiStyle,
} from '@/lib/map/customLayers/FieldPixiLayer';

// ✅ Supabase-generated types (DB enum source of truth) — updated path
import type { Database } from '@/integrations/supabase/types';
// UI vibe tokens
import { VIBE_RGB, type Vibe as UiVibe } from '@/lib/vibes';
// Grayscale tokens
import { GRAY_RGB, type UiGrayToken } from '@/lib/tokens/grayscale';
// Live controls bus
import {
  getOverlayControls,
  subscribeOverlayControls,
  type OverlayControls,
} from '@/lib/field/overlayStyleBus';

export type PixiBridgeOptions = {
  layerId?: string;
  beforeId?: string | undefined;

  // Static defaults (UI can override live via bus)
  colorize?: boolean | 'auto';
  dim?: boolean | 'auto';
  dimFactor?: number;
  friendHalo?: boolean;
  monochrome?: boolean | 'auto';
  monochromeToken?: UiGrayToken;
  youId?: string;

  // Extra style overrides (rare)
  styleProvider?: () => Partial<FieldPixiStyle> | undefined;
};

type DbVibe = Database['public']['Enums']['vibe_enum'];

export function attachFieldPixiBridge(
  map: mapboxgl.Map,
  opts: PixiBridgeOptions = {}
): () => void {
  const layerId = opts.layerId ?? 'field-pixi';

  // Create + add layer if missing
  if (!map.getLayer(layerId)) {
    const initControls = mergeControlsWithOptions(getOverlayControls(), opts);
    const layer = createFieldPixiLayer({
      id: layerId,
      style: {
        enableColor: (initControls.monochrome || initControls.colorize),
        dimFactor: initControls.dim ? initControls.dimFactor : 1.0,
      },
    });
    map.addLayer(layer as any, opts.beforeId);
    (map as any).__fieldPixi = layer;
  }

  const layer = (map as any).__fieldPixi as ReturnType<typeof createFieldPixiLayer> | undefined;
  if (!layer) return () => {};

  const push = () => {
    // Read live controls (UI) merged with any static opts
    const controls = mergeControlsWithOptions(getOverlayControls(), opts);

    // Style update (color enable + dim factor)
    layer.setStyle({
      enableColor: controls.monochrome || controls.colorize,
      dimFactor: controls.dim ? controls.dimFactor : 1.0,
    });

    // Convert current data + push points
    const snap = getFieldOverlaySnapshot();
    const pts = glPointsConvertDynamic(snap, controls);
    layer.setPoints(pts);

    // Extra style hook
    const extra = opts.styleProvider?.();
    if (extra && Object.keys(extra).length > 0) {
      layer.setStyle(extra);
    }
  };

  // Initial push
  push();

  // React to data AND to live control changes
  const unsubData = subscribeFieldOverlay(push);
  const unsubUi = subscribeOverlayControls(push);

  // Refresh on map transforms
  const refresh = () => push();
  map.on('move', refresh);
  map.on('zoom', refresh);
  map.on('rotate', refresh);

  return () => {
    unsubData();
    unsubUi();
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

/** Merge static opts with live UI controls (UI wins when opts use 'auto' or are undefined) */
function mergeControlsWithOptions(ui: OverlayControls, opts: PixiBridgeOptions): OverlayControls {
  return {
    monochrome: opts.monochrome === 'auto' || opts.monochrome === undefined ? ui.monochrome : Boolean(opts.monochrome),
    monochromeToken: opts.monochromeToken ?? ui.monochromeToken,
    colorize: opts.colorize === 'auto' || opts.colorize === undefined ? ui.colorize : Boolean(opts.colorize),
    dim: opts.dim === 'auto' || opts.dim === undefined ? ui.dim : Boolean(opts.dim),
    dimFactor: opts.dimFactor ?? ui.dimFactor,
    friendHalo: opts.friendHalo ?? ui.friendHalo,
    youId: opts.youId ?? ui.youId,
  };
}

/** Converter that uses *live* controls for color/halos/you-pin each push */
function glPointsConvertDynamic(rows: RawOverlayEntity[], controls: OverlayControls): FieldPoint[] {
  const out: FieldPoint[] = [];
  const monoRGB = GRAY_RGB[controls.monochromeToken];
  const monoColor = (monoRGB[0] << 16) | (monoRGB[1] << 8) | monoRGB[2];

  for (const r of rows) {
    const id = getId(r);
    const lat = toNum(r.lat);
    const lng = toNum(r.lng);
    if (!id || !isFiniteNum(lat) || !isFiniteNum(lng)) continue;

    const vibeDb = safeDbVibe(r.vibe);
    const ui: UiVibe = toUiVibe(vibeDb);

    const isFriend = Boolean(r.isFriend);
    const isYou = Boolean(r.isYou ?? r.you ?? (controls.youId ? id === controls.youId : false));

    const intensity = computeIntensityDb(isFriend, vibeDb);

    let color: number;
    if (controls.monochrome) {
      color = monoColor;
    } else if (controls.colorize) {
      const [rr, gg, bb] = VIBE_RGB[ui];
      color = (rr << 16) | (gg << 8) | bb;
    } else {
      color = monoColor; // neutral token even when not monochrome mode
    }

    const halo = controls.friendHalo && isFriend;
    const haloColor = color;
    const haloScale = isYou ? 3.0 : 2.4;

    out.push({ id, lat, lng, intensity, color, halo, haloColor, haloScale, isYou });
  }
  return out;
}

/* ------------------------- vibe helpers (DB-typed) ------------------------ */
const DB_VIBES: readonly DbVibe[] = [
  'chill','hype','curious','social','solo','romantic','weird','down','flowing','open','energetic','excited','focused',
] as const;

function isDbVibe(x: unknown): x is DbVibe {
  return typeof x === 'string' && (DB_VIBES as readonly string[]).includes(x);
}
function safeDbVibe(x: unknown): DbVibe { return isDbVibe(x) ? x : 'social'; }
function toUiVibe(v: DbVibe): UiVibe {
  switch (v) {
    case 'energetic':
    case 'excited':
    case 'hype': return 'hype';
    case 'focused': return 'solo';
    case 'chill': return 'chill';
    case 'curious': return 'curious';
    case 'social': return 'social';
    case 'solo': return 'solo';
    case 'romantic': return 'romantic';
    case 'weird': return 'weird';
    case 'down': return 'down';
    case 'flowing': return 'flowing';
    case 'open': return 'open';
    default: return 'social';
  }
}
const VIBE_INTENSITY_BASE_DB: Record<DbVibe, number> = {
  chill: 0.85, hype: 1.00, curious: 0.95, social: 1.00, solo: 0.80, romantic: 0.90,
  weird: 0.95, down: 0.60, flowing: 0.90, open: 0.90, energetic: 1.00, excited: 0.98, focused: 0.85,
};
function computeIntensityDb(isFriend: boolean, vibe: DbVibe): number {
  const base = VIBE_INTENSITY_BASE_DB[vibe] ?? 0.9;
  const friendBoost = isFriend ? 1.05 : 1.0;
  return clamp(base * friendBoost, 0.1, 1);
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