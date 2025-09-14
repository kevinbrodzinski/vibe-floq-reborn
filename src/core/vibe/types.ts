import type { Vibe } from "@/lib/vibes";
import type { VenueIntelligence } from "@/types/venues";

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
  hour: number;
  isWeekend: boolean;
  
  speedMps?: number;
  dwellMinutes?: number;
  screenOnRatio01?: number;
  
  // Weather (unified)
  isDaylight?: boolean;
  weatherEnergyOffset?: number;
  weatherConfidenceBoost?: number;
  
  // Venue enrichment (if present)
  venueArrived?: boolean;
  venueType?: string | null;
  venueEnergyBase?: number | null;
  venueIntelligence?: VenueIntelligence | null;
  
  // Pattern integration
  patterns?: {
    chronotype: 'lark' | 'owl' | 'balanced';
    energyType: 'high-energy' | 'balanced' | 'low-energy';
    socialType: 'social' | 'balanced' | 'solo';
    consistency: 'very-consistent' | 'consistent' | 'adaptive' | 'highly-adaptive';
    hasEnoughData: boolean;
    temporalPrefs?: Record<number, Partial<Record<Vibe, number>>>;
  };
};

export type VibeReading = {
  timestamp: number;
  vibe: Vibe;
  confidence01: number;
  components: ComponentScores;
  vector: VibeVector;               // normalized scores
  calcMs: number;                   // perf
  venueIntelligence?: VenueIntelligence | null;
};