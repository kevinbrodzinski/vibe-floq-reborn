import type { EngineInputs } from "../types";

// screen use → often "solo/focused"
export function deviceUsage({ screenOnRatio01 = 0 }: EngineInputs) {
  return Math.max(0, Math.min(1, screenOnRatio01));
}