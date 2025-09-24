import type { EngineInputs } from "../types";

// speed → energy/social suggestion (0..1)
export function movementEnergy({ speedMps = 0 }: EngineInputs) {
  const clamped = Math.max(0, Math.min(3, speedMps));  // cap at jog
  return Math.min(1, clamped / 1.5); // ~1.5 m/s walking peak
}