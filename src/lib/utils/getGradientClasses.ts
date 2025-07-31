
import { KIND_COLOUR, VIBE_COLOUR, StopKind, VibeTag } from '@/lib/theme/stopColours';
import type { Vibe } from '@/types/vibes';

export function getGradientClasses(kind: StopKind, vibe?: VibeTag) {
  // vibe overrides kind when present, with safe fallback for unknown vibes
  if (vibe && VIBE_COLOUR[vibe]) {
    return `bg-gradient-to-br ${VIBE_COLOUR[vibe]}`;
  }
  
  // Fallback to 'chill' if vibe is unrecognized
  if (vibe && !VIBE_COLOUR[vibe]) {
    console.warn(`Unknown vibe "${vibe}", falling back to chill`);
    return `bg-gradient-to-br ${VIBE_COLOUR['chill']}`;
  }
  
  return `bg-gradient-to-br ${KIND_COLOUR[kind]}`;
}

// Extended function for database vibe enums
export function getVibeGradient(kind: StopKind, vibe?: Vibe): string {
  const vibeToTheme: Record<Vibe, VibeTag> = {
    chill: 'chill',
    social: 'chill', 
    hype: 'wild',
    flowing: 'chill',
    open: 'artsy',
    curious: 'artsy',
    solo: 'chill',
    romantic: 'romantic',
    weird: 'wild',
    down: 'chill',
    energetic: 'wild',
    excited: 'wild',
    focused: 'chill',
  };

  // Handle undefined vibe with fallback
  if (!vibe) {
    return `bg-gradient-to-br ${KIND_COLOUR[kind]}`;
  }

  const themeVibe = vibeToTheme[vibe];
  return getGradientClasses(kind, themeVibe);
}
