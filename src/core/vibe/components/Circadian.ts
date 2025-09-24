import type { EngineInputs } from "../types";

// returns 0..1 energy baseline by hour
export function circadianEnergy({ hour }: EngineInputs) {
  // gentle curve: low early morning, peak evening
  const table = [0.15,0.15,0.15,0.15,0.2,0.25,0.3,0.4,0.5,0.55,0.6,0.65,
                 0.7,0.72,0.75,0.78,0.8,0.85,0.88,0.9,0.85,0.65,0.45,0.25];
  return table[Math.max(0, Math.min(23, hour))];
}