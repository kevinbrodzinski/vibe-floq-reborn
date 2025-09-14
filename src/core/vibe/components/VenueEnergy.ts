import type { EngineInputs } from "../types";

// dwell → "settled social" vs "transit"
export function venueEnergy({ dwellMinutes = 0 }: EngineInputs) {
  if (dwellMinutes < 2) return 0.1;     // transient
  if (dwellMinutes < 10) return 0.4;
  if (dwellMinutes < 60) return 0.7;
  return 0.8;
}