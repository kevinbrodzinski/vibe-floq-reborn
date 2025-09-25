import { useMemo } from "react";
import type { FloqCardItem } from "@/components/floqs/cards/FloqCard";

/**
 * Compatibility: vibe-weighted recsys score (0..1)
 * Friction: distance from current pattern = ETA + entry policy + vibe gap
 * Energy: current activity vs recent peak
 */
export function useFloqScores(item: FloqCardItem) {
  // COMPATIBILITY
  const compatibility = clamp01(item.recsys_score ?? 0.68);

  // FRICTION
  const eta = clamp01((item.eta_minutes ?? 0) / 30); // normalize 30m cap
  const entryPenalty =
    item.door_policy === "line" ? 0.35 :
    item.door_policy === "cover" ? 0.25 :
    item.door_policy === "guest" ? 0.15 : 0;

  // If your engine exposes user-vs-floq vibe delta (0..1), wire it here:
  const vibeGap = clamp01((item as any).vibe_delta ?? 0.15);

  const friction = clamp01(0.5 * eta + 0.3 * entryPenalty + 0.2 * vibeGap);

  // ENERGY
  const energyNow = clamp01(item.energy_now ?? 0.6);
  const peak = Math.max(energyNow, item.energy_peak ?? 0.75);
  const peakRatio = peak > 0 ? energyNow / peak : 0;

  return useMemo(() => ({
    compatibilityPct: Math.round(compatibility * 100),
    friction,
    energyNow,
    peakRatio,
  }), [compatibility, friction, energyNow, peakRatio]);
}

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }