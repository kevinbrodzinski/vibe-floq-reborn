// Tokenized vibe color resolver: always returns design tokens, never hex.
// Downstream UI should read fields and pass them into classNames or CSS vars.

import type { Vibe } from "@/lib/vibes";                   // your canonical vibe type
import { getVibeToken } from "@/lib/tokens/vibeTokens";   // canonical token generator

export type VibeResolved = ReturnType<typeof getVibeToken>;

/** Full token set for a vibe (bg/fg/ring/glow/gradient/etc) */
export function resolveVibeTokens(vibe: Vibe): VibeResolved {
  return getVibeToken(vibe);
}

/** Convenience getters (use in places that only need a single slot) */
export function resolveBg(vibe: Vibe)   { return getVibeToken(vibe).bg;   }
export function resolveFg(vibe: Vibe)   { return getVibeToken(vibe).fg;   }
export function resolveRing(vibe: Vibe) { return getVibeToken(vibe).ring; }
export function resolveGlow(vibe: Vibe) { return getVibeToken(vibe).glow; }
export function resolveGrad(vibe: Vibe) { return getVibeToken(vibe).gradient; }