import { KIND_COLOUR, VIBE_COLOUR, StopKind, VibeTag } from '@/lib/theme/stopColours';

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