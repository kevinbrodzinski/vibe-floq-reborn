// Single canonical source of truth for vibes
// These are the vibes that appear on the vibe wheel and are used throughout the UI
// Enforce at compile-time that VIBES is only values of Vibe:
export const VIBES = [
  'chill','flowing','romantic','hype','weird','solo','social','open','down','curious','energetic','excited','focused',
] as const satisfies readonly Vibe[];

import { Database } from '@/integrations/supabase/types';

export type Vibe = Database['public']['Enums']['vibe_enum'];

export const VIBE_LABEL: Record<Vibe, string> = {
  chill: 'Chill',
  hype: 'Hype',
  curious: 'Curious',
  social: 'Social',
  solo: 'Solo',
  romantic: 'Romantic',
  weird: 'Weird',
  down: 'Down',
  flowing: 'Flowing',
  open: 'Open',
  energetic: 'Energetic',
  excited: 'Excited',
  focused: 'Focused',
};

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
  energetic:[255, 165,   0], // Orange for energy
  excited: [255,  20, 147], // Deep pink for excitement
  focused: [ 50, 205,  50], // Lime green for focus
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
  energetic:`rgb(${VIBE_RGB.energetic.join(', ')})`,
  excited:  `rgb(${VIBE_RGB.excited.join(', ')})`,
  focused:  `rgb(${VIBE_RGB.focused.join(', ')})`,
};

// Optional dev assert on boot:
if (import.meta && (import.meta as any).env?.DEV) {
  const ui = new Set(VIBES);
  const db = new Set<Vibe>([
    "chill","hype","curious","social","solo","romantic","weird","down","flowing","open","energetic","excited","focused"
  ]);
  for (const k of [...ui, ...db]) {
    if (!ui.has(k) || !db.has(k)) {
      // eslint-disable-next-line no-console
      console.warn("[vibes] UI/DB mismatch:", { ui: [...ui], db: [...db] });
      break;
    }
  }
}