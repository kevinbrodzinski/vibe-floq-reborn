// Single source of truth for vibe preferences
export const DEFAULT_PREFS = {
  chill: 0,
  curious: 0,
  down: 0,
  flowing: 0,
  hype: 0,
  open: 0,
  romantic: 0,
  social: 0,
  solo: 0,
  weird: 0,
} as const;

export type VibePrefs = typeof DEFAULT_PREFS;