// Single canonical source of truth for vibes
export const VIBES = [
  'chill', 'hype', 'curious', 'social', 'solo', 'romantic',
  'weird', 'down', 'flowing', 'open', 'energetic', 'excited', 'focused',
] as const;

export type Vibe = (typeof VIBES)[number];

// Validation helpers
export const isValidVibe = (value: unknown): value is Vibe => {
  return typeof value === 'string' && VIBES.includes(value as Vibe);
};

export const safeVibe = (value: unknown): Vibe => {
  return isValidVibe(value) ? value : 'chill';
};