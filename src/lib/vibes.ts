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
};

// HSL colors for CSS (using Tailwind tokens where appropriate)
export const VIBE_COLORS: Record<Vibe, string> = {
  chill:    'hsl(var(--accent))',
  flowing:  'hsl(30 70% 60%)',
  romantic: 'hsl(320 70% 60%)',
  hype:     'hsl(0 70% 60%)',
  weird:    'hsl(60 70% 60%)',
  solo:     'hsl(240 70% 60%)',
  social:   'hsl(200 70% 60%)',
  open:     'hsl(120 70% 60%)',
  down:     'hsl(280 70% 60%)',
};