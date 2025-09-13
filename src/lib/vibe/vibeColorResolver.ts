// Default palette you can tune any time.
export const DEFAULT_PALETTE = {
  social:       '#8B5CF6', // violet-500
  'high-energy':'#EF4444', // red-500
  chill:        '#38BDF8', // sky-400
  focus:        '#06B6D4', // cyan-500
  romantic:     '#F472B6', // pink-400
  mellow:       '#F59E0B', // amber-500
  outdoors:     '#22C55E', // green-500
  live:         '#EAB308', // yellow-500
  unknown:      '#EC4899', // Floq pink fallback
} as const;

export type VibeKey = keyof typeof DEFAULT_PALETTE;
type ResolverResult = { vibeKey?: VibeKey; vibeHex?: string } | null | undefined;
type ResolverFn = (input: { venueId?: string; venueName?: string }) => ResolverResult;

let resolver: ResolverFn | null = null;

/** DI: your vibe engine can register a resolver at runtime. */
export function setVibeColorResolver(fn: ResolverFn) {
  resolver = fn;
}

/** Resolve final hex color for a convergence/venue.
 * Priority:
 * 1) payload.vibeHex
 * 2) payload.vibeKey -> DEFAULT_PALETTE
 * 3) custom resolver({venueId, venueName})
 * 4) DEFAULT_PALETTE.unknown
 */
export function resolveVibeHex(payload: {
  venueId?: string;
  venueName?: string;
  vibeKey?: string;
  vibeHex?: string;
}): string {
  const raw = payload.vibeHex;
  if (raw && /^#?[0-9a-f]{6}$/i.test(raw)) return raw.startsWith('#') ? raw : `#${raw}`;

  const k = (payload.vibeKey as VibeKey | undefined);
  if (k && DEFAULT_PALETTE[k]) return DEFAULT_PALETTE[k];

  if (resolver) {
    try {
      const r = resolver({ venueId: payload.venueId, venueName: payload.venueName });
      if (r?.vibeHex && /^#?[0-9a-f]{6}$/i.test(r.vibeHex)) return r.vibeHex.startsWith('#') ? r.vibeHex : `#${r.vibeHex}`;
      if (r?.vibeKey && DEFAULT_PALETTE[r.vibeKey]) return DEFAULT_PALETTE[r.vibeKey];
    } catch {}
  }
  return DEFAULT_PALETTE.unknown;
}