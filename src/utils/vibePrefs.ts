// Single source of truth for vibe preferences
export const ALL_VIBES = [
  "chill","curious","down","flowing",
  "hype","open","romantic","social","solo","weird",
] as const;

export type Vibe = typeof ALL_VIBES[number];

export const DEFAULT_PREFS: Record<Vibe, number> = Object.fromEntries(
  ALL_VIBES.map(v => [v, 0]),
) as any;

export type VibePrefs = typeof DEFAULT_PREFS;