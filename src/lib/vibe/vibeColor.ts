// Lightweight vibe color resolver with preview support (web-safe)
// Usage:
//  - resolveVibeColor({ vibeHex, vibeKey, venueId, venueName })
//  - setVibeColorResolver(ctx => ({ vibeKey: 'social' })) // optional external mapping
//  - enableVibePreview(true) / cycleVibePreview()

export type VibeKey =
  | 'social' | 'chill' | 'mellow' | 'outdoors' | 'energetic'
  | 'focused' | 'romantic' | 'live' | 'unknown';

const DEFAULT_PALETTE: Record<VibeKey, string> = {
  social:    '#8B5CF6', // violet-500
  energetic: '#EF4444', // red-500
  chill:     '#38BDF8', // sky-400
  focused:   '#06B6D4', // cyan-500
  romantic:  '#F472B6', // pink-400
  mellow:    '#F59E0B', // amber-500
  outdoors:  '#22C55E', // green-500
  live:      '#EAB308', // yellow-500
  unknown:   '#EC4899', // floq pink fallback
};

// Acceptable synonyms → canonical keys
const SYNONYMS: Record<string, VibeKey> = {
  'high-energy': 'energetic',
  energy:        'energetic',
  relaxed:       'chill',
  romance:       'romantic',
  focus:         'focused',
};

type Resolver = (ctx: { venueId?: string; venueName?: string }) =>
  | { vibeHex?: string; vibeKey?: VibeKey }
  | null
  | undefined;

let extResolver: Resolver | null = null;
export function setVibeColorResolver(resolver: Resolver | null) {
  extResolver = resolver;
}

// --- Preview state (persisted) ---
const PREVIEW_COLORS = [
  '#EC4899', // pink
  '#8B5CF6', // violet
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#22D3EE', // cyan
];

const LS_ON  = 'floq:vibePreview:on';
const LS_IDX = 'floq:vibePreview:idx';
let previewOn = (() => {
  try { return localStorage.getItem(LS_ON) === 'true'; } catch { return false; }
})();
let previewIdx = (() => {
  try {
    const n = Number(localStorage.getItem(LS_IDX));
    return Number.isFinite(n) ? (n % PREVIEW_COLORS.length + PREVIEW_COLORS.length) % PREVIEW_COLORS.length : 0;
  } catch { return 0; }
})();

export function enableVibePreview(on: boolean) {
  previewOn = !!on;
  try { localStorage.setItem(LS_ON, String(previewOn)); } catch {}
}
export function cycleVibePreview() {
  previewIdx = (previewIdx + 1) % PREVIEW_COLORS.length;
  try { localStorage.setItem(LS_IDX, String(previewIdx)); } catch {}
}
export function isVibePreviewEnabled() { return previewOn; }
export function getVibePreviewColor() { return PREVIEW_COLORS[previewIdx]; }

// Main resolver
export function resolveVibeColor(input: {
  vibeHex?: string;
  vibeKey?: VibeKey | string;
  venueId?: string;
  venueName?: string;
}): string {
  // Preview wins for design QA
  if (previewOn) return getVibePreviewColor();

  // 1) Explicit hex: #rgb or #rrggbb (with or w/o leading #)
  const raw = input.vibeHex?.trim();
  if (raw) {
    const h = raw.startsWith('#') ? raw : `#${raw}`;
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) return h;
  }

  // 2) Explicit key
  let k = (input.vibeKey as VibeKey | undefined) ?? undefined;
  if (k && !DEFAULT_PALETTE[k]) {
    const norm = SYNONYMS[String(k).toLowerCase()];
    if (norm) k = norm;
  }
  if (k && DEFAULT_PALETTE[k]) return DEFAULT_PALETTE[k];

  // 3) External resolver
  if (extResolver) {
    try {
      const r = extResolver({ venueId: input.venueId, venueName: input.venueName }) || undefined;
      if (r?.vibeHex) {
        const h2 = r.vibeHex.startsWith('#') ? r.vibeHex : `#${r.vibeHex}`;
        if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h2)) return h2;
      }
      if (r?.vibeKey) {
        const rk = (SYNONYMS[String(r.vibeKey).toLowerCase()] ?? r.vibeKey) as VibeKey;
        if (DEFAULT_PALETTE[rk]) return DEFAULT_PALETTE[rk];
      }
    } catch { /* ignore */ }
  }
  
  // 4) Fallback
  return DEFAULT_PALETTE.unknown;
}

// Legacy alias for backwards compatibility
export const resolveVibeHex = resolveVibeColor;