// Re-export canonical vibe types
export type { Vibe } from '@/lib/vibes';
export { VIBES, VIBE_ORDER, safeVibe, isValidVibe } from '@/lib/vibes';

// Legacy compatibility exports
export type VibeEnum = Vibe;
export const vibeOptions = VIBE_ORDER;

// Additional compatibility exports
export { safeVibe as safeVibeState } from '@/lib/vibes';