import type { Vibe } from '@/types/vibes';

export function safeVibe(vibe?: string): Vibe {
  const validVibes: Vibe[] = ['social', 'chill', 'hype', 'curious', 'solo', 'romantic', 'weird', 'down', 'flowing', 'open'];
  
  if (vibe && validVibes.includes(vibe as Vibe)) {
    return vibe as Vibe;
  }
  
  return 'social'; // Default fallback
}