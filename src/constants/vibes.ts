/** The canonical order clockwise around the wheel */
export const VIBE_ORDER = [
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

export type VibeEnum = (typeof VIBE_ORDER)[number];

/** Tailwind token names (no raw hex) */
export const VIBE_COLORS: Record<VibeEnum, string> = {
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

export const VIBE_OPTIONS: VibeEnum[] = [...VIBE_ORDER];