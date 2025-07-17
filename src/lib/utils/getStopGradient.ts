import { KIND_COLOUR, VIBE_COLOUR, StopKind, VibeTag } from '@/lib/theme/stopColours';

export function getStopGradient(kind: StopKind, vibe?: VibeTag) {
  // vibe overrides kind when present
  return `bg-gradient-to-br ${vibe ? VIBE_COLOUR[vibe] : KIND_COLOUR[kind]}`;
}