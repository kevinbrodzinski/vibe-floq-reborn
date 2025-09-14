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

// Weather condition types
export type WeatherCondition =
  | 'Clear'|'Clouds'|'Rain'|'Drizzle'|'Thunderstorm'|'Snow'
  | 'Mist'|'Fog'|'Haze'|'Dust'|'Smoke'|'Sand'|'Ash'|'Squall'|'Tornado'
  | 'unknown';

// Weather signal with unified shape
export type WeatherSignal = {
  isDaylight: boolean;
  tempC?: number;
  condition?: WeatherCondition;
  energyOffset?: number; // -0.2..+0.2: how weather nudges "energy"
  confidenceBoost?: number; // 0..0.1: tiny confidence nudge for stable conditions
};

// User correction record used by learner
export type CorrectionHistory = {
  timestamp: number;
  predicted: VibeVector;                  // engine vector at the time
  corrected: Vibe;                        // user's chosen vibe
  components: ComponentScores;            // 0..1 component strengths
  context: {
    temporal: { hour: number; isWeekend: boolean };
    venue: { type: string; energy?: number } | null;
    movement: { speedMps?: number; moving01?: number } | null;
  };
};

// Lightweight scheduler snapshot
export type SignalSnapshot = {
  movement: { speedMps?: number };
  device: { screenOnRatio01?: number };
  venue: { type: string } | null;
};

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
  
  // Rich weather fields
  weatherCondition?: WeatherCondition;
  weatherEnergyOffset?: number;
  weatherConfidenceBoost?: number;
};

export type VibeReading = {
  timestamp: number;
  vibe: Vibe;
  confidence01: number;
  components: ComponentScores;
  vector: VibeVector;               // normalized scores
  calcMs: number;                   // perf
};