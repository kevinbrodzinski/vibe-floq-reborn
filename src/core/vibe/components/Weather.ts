import type { EngineInputs } from "../types";

// crude: daylight + energy offset → slight positive mood/energy
export function weatherLift({ isDaylight, weatherEnergyOffset }: EngineInputs) {
  if (isDaylight === undefined) return 0;
  const base = isDaylight ? 0.3 : 0;
  const offset = weatherEnergyOffset ?? 0;
  return Math.max(0, base + offset);
}