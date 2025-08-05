import { VIBES, type Vibe, safeVibe as canonicalSafeVibe } from '@/lib/vibes';

export function safeVibe(vibe?: string): Vibe {
  return canonicalSafeVibe(vibe);
}