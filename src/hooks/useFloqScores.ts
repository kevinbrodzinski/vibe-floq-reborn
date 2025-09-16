import { useMemo } from "react";
import type { FloqCardItem } from "@/components/floqs/cards/FloqCard";

// Adapted mapping to your vibe engine concepts (Compatibility, Friction, Energy)
export function useFloqScores(item: FloqCardItem) {
  // COMPATIBILITY: fits typical pattern (use your recsys/vibe score if present)
  const compatibilityPct = Math.round((item.recsys_score ?? 0.68) * 100);

  // FRICTION: distance from current pattern = ETA + entry policy + energy gap (0..1)
  const eta = Math.min(1, (item.eta_minutes ?? 0) / 30); // cap 30m
  const entryPenalty =
    item.door_policy === "line" ? 0.35 :
    item.door_policy === "cover" ? 0.25 :
    item.door_policy === "guest" ? 0.15 : 0;
  const energyGap = 0.15; // TODO: wire to (user_vibe − floq_vibe) magnitude
  const friction = clamp01(0.5 * eta + 0.3 * entryPenalty + 0.2 * energyGap);

  // ENERGY: live activity vs rolling peak
  const energyNow = clamp01(item.energy_now ?? 0.6);
  const peak = Math.max(energyNow, item.energy_peak ?? 0.75);
  const peakRatio = peak > 0 ? energyNow / peak : 0;

  return useMemo(() => ({ compatibilityPct, friction, energyNow, peakRatio }), [compatibilityPct, friction, energyNow, peakRatio]);
}

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }