import { circadianEnergy }  from "./components/Circadian";
import { movementEnergy }   from "./components/Movement";
import { venueEnergy }      from "./components/VenueEnergy";
import { deviceUsage }      from "./components/DeviceUsage";
import { weatherLift }      from "./components/Weather";
import { combine, confidence } from "./MasterEquation";
import type { EngineInputs, ComponentScores, VibeReading } from "./types";
import { VIBES } from "@/lib/vibes";

export function evaluate(inputs: EngineInputs): VibeReading {
  const t0 = performance.now();

  const components: ComponentScores = {
    circadian:  circadianEnergy(inputs),
    movement :  movementEnergy(inputs),
    venueEnergy: venueEnergy(inputs),
    deviceUsage: deviceUsage(inputs),
    weather:     weatherLift(inputs) || 0,
  };

  const vector = combine(components);
  // pick argmax
  const best = VIBES.reduce((a,b)=> (vector[b] > vector[a] ? b : a), VIBES[0]);
  const conf = confidence(components);

  const calcMs = Math.max(0, performance.now() - t0);
  return {
    timestamp: Date.now(),
    vibe: best,
    confidence01: conf,
    components,
    vector,
    calcMs
  };
}