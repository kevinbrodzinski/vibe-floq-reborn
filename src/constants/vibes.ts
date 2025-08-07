// Import for local use and re-export
import { 
  VIBES,
  VIBE_ORDER, 
  VIBE_COLORS,
  VIBE_RGB,
  type Vibe,
  isValidVibe,
  safeVibe
} from '@/lib/vibes';

// Re-export canonical vibe definitions from lib/vibes
export { 
  VIBES,
  VIBE_ORDER, 
  VIBE_COLORS,
  VIBE_RGB,
  type Vibe,
  isValidVibe,
  safeVibe
};

// Legacy exports for backward compatibility
export type VibeEnum = Vibe;
export const VIBE_OPTIONS: Vibe[] = [...VIBE_ORDER];