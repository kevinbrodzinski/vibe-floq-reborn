import type { Vibe } from "@/lib/vibes";

export type { Vibe };

export type ComponentKey =
  | "circadian"
  | "movement"
  | "venueEnergy"
  | "deviceUsage"
  | "weather"; // optional, can be 0

export type VibeVector = Record<Vibe, number>;
export type ComponentScores = Record<ComponentKey, number>;

export type EngineInputs = {
  // jot what you have locally; all optional (engine will degrade gracefully)
  hour: number;                     // 0-23
  isWeekend: boolean;
  speedMps?: number;                // movement proxy (0..)
  dwellMinutes?: number;            // at current venue
  screenOnRatio01?: number;         // device activity 0..1
  tempC?: number;                   // optional (weather)
  isDaylight?: boolean;             // optional
  venueArrived?: boolean;           // NEW: arrived state
  venueType?: string | null;        // coarse class (bar, cafe, gym...)
  venueEnergyBase?: number | null;  // baseline energy 0..1 from classifier
};

export type VibeReading = {
  timestamp: number;
  vibe: Vibe;
  confidence01: number;
  components: ComponentScores;
  vector: VibeVector;               // normalized scores
  calcMs: number;                   // perf
};