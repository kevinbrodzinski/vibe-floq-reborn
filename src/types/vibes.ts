// Re-export canonical vibe types and constants from the single source of truth
import { 
  VIBES, 
  VIBE_ORDER, 
  VIBE_RGB,
  VIBE_COLORS,
  safeVibe, 
  isValidVibe,
  type Vibe
} from '@/lib/vibes';

// Primary exports
export type { Vibe };
export { 
  VIBES, 
  VIBE_ORDER, 
  VIBE_RGB,
  VIBE_COLORS,
  safeVibe, 
  isValidVibe 
};

// Legacy compatibility exports
export type VibeEnum = Vibe;
export const vibeOptions = VIBE_ORDER;
export const safeVibeState = safeVibe;