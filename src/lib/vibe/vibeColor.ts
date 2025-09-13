export type VibeKey =
  | 'social'
  | 'chill'
  | 'focus'
  | 'high-energy'
  | 'romantic'
  | 'mellow'
  | 'outdoors'
  | 'live'
  | 'unknown';

const DEFAULT_PALETTE: Record<VibeKey, string> = {
  social:      '#8B5CF6', // violet-500
  'high-energy': '#EF4444', // red-500
  chill:       '#38BDF8', // sky-400
  focus:       '#06B6D4', // cyan-500
  romantic:    '#F472B6', // pink-400
  mellow:      '#F59E0B', // amber-500
  outdoors:    '#22C55E', // green-500
  live:        '#EAB308', // yellow-500
  unknown:     '#EC4899', // floq pink fallback
};

type ResolverResult = { vibeKey?: VibeKey; vibeHex?: string } | null | undefined;
type ResolverFn = (input: { venueId?: string; venueName?: string }) => ResolverResult;

let resolver: ResolverFn | null = null;

/** Optional DI hook: your vibe engine can register a resolver at runtime. */
export function setVibeColorResolver(fn: ResolverFn) {
  resolver = fn;
}

/** Resolve final hex color for a convergence point. Priority:
 * 1) payload.vibeHex
 * 2) payload.vibeKey -> DEFAULT_PALETTE
 * 3) resolver({ venueId, venueName })
 * 4) DEFAULT_PALETTE.unknown
 */
export function resolveVibeHex(payload: {
  venueId?: string;
  venueName?: string;
  vibeKey?: string;
  vibeHex?: string;
}): string {
  // 1) direct override
  const raw = payload.vibeHex;
  if (raw && /^#?[0-9a-f]{6}$/i.test(raw)) return raw.startsWith('#') ? raw : `#${raw}`;

  // 2) canonical key
  const k = (payload.vibeKey as VibeKey | undefined) ?? undefined;
  if (k && DEFAULT_PALETTE[k]) return DEFAULT_PALETTE[k];

  // 3) custom resolver
  if (resolver) {
    try {
      const r = resolver({ venueId: payload.venueId, venueName: payload.venueName });
      if (r?.vibeHex && /^#?[0-9a-f]{6}$/i.test(r.vibeHex)) {
        return r.vibeHex.startsWith('#') ? r.vibeHex : `#${r.vibeHex}`;
      }
      if (r?.vibeKey && DEFAULT_PALETTE[r.vibeKey]) return DEFAULT_PALETTE[r.vibeKey];
    } catch { /* ignore */ }
  }

  // 4) safe default
  return DEFAULT_PALETTE.unknown;
}