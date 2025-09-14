import type { EngineInputs } from "./types";

// NOTE: this is a HOOK wrapper for convenience
export function useSignalCollector() {
  // Simple implementation - can be enhanced with useGeo later
  return {
    collect: (): EngineInputs => {
      const now = new Date();
      // speed: if you don't have motion yet, derive from location delta later; start at 0
      const hour = now.getHours();
      return {
        hour,
        isWeekend: [0,6].includes(now.getDay()),
        speedMps: 0,
        dwellMinutes: 0,
        screenOnRatio01: 0,     // wire to real screen/on time if available
        // minimal weather/daylight (defer to P2)
        isDaylight: undefined,
        tempC: undefined,
      };
    }
  };
}