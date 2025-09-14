import type { EngineInputs } from "../types";

// crude: daylight + mild temp → slight positive mood/energy
export function weatherLift({ isDaylight, tempC }: EngineInputs) {
  if (isDaylight === undefined || tempC === undefined) return 0;
  const mild = 1 - Math.min(1, Math.abs(tempC - 22) / 20); // peak near 22°C
  return Math.max(0, (isDaylight ? 0.3 : 0) + 0.4 * mild);
}