// Single canonical source of truth for vibes
// These are the vibes that appear on the vibe wheel and are used throughout the UI
export const VIBES = [
  'chill',
  'flowing', 
  'romantic',
  'hype',
  'weird',
  'solo',
  'social',
  'open',
  'down',
  'curious',
] as const;

export type Vibe = (typeof VIBES)[number];

// Validation helpers
export const isValidVibe = (value: unknown): value is Vibe => {
  return typeof value === 'string' && VIBES.includes(value as Vibe);
};

export const safeVibe = (value: unknown): Vibe => {
  return isValidVibe(value) ? value : 'chill';
};

// Export the canonical order for wheel positioning
export const VIBE_ORDER = [...VIBES];

// RGB values for each vibe (used in animations and gradients)
export const VIBE_RGB: Record<Vibe, [number, number, number]> = {
  chill:   [ 76, 146, 255],
  flowing: [  0, 194, 209],
  romantic:[255,  99, 199],
  hype:    [255,  71,  87],
  weird:   [167,  80, 255],
  solo:    [142, 142, 147],
  social:  [ 35, 209,  96],
  open:    [175,  82, 222],
  down:    [ 88,  86, 214],
  curious: [255, 193,   7], // Yellow-orange for curiosity
};

// RGB colors converted to CSS rgb() format for consistency
export const VIBE_COLORS: Record<Vibe, string> = {
  chill:    `rgb(${VIBE_RGB.chill.join(', ')})`,
  flowing:  `rgb(${VIBE_RGB.flowing.join(', ')})`,
  romantic: `rgb(${VIBE_RGB.romantic.join(', ')})`,
  hype:     `rgb(${VIBE_RGB.hype.join(', ')})`,
  weird:    `rgb(${VIBE_RGB.weird.join(', ')})`,
  solo:     `rgb(${VIBE_RGB.solo.join(', ')})`,
  social:   `rgb(${VIBE_RGB.social.join(', ')})`,
  open:     `rgb(${VIBE_RGB.open.join(', ')})`,
  down:     `rgb(${VIBE_RGB.down.join(', ')})`,
  curious:  `rgb(${VIBE_RGB.curious.join(', ')})`,
};