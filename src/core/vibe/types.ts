import type { Vibe } from "@/lib/vibes";
import type { VenueIntelligence } from "@/types/venues";
import type { VibeDist } from "@/types/personality";

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

// User correction record used by learner - CANONICAL VERSION
export type CorrectionHistory = {
  timestamp: number;
  predicted: VibeVector;
  corrected: Vibe;
  components: ComponentScores;
  context: {
    hourOfDay: number;
    dayOfWeek: number;            // 0–6
    isWeekend: boolean;
    venue?: { type: string } | null;
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
  
  // Weather (unified shape)
  isDaylight?: boolean;
  weatherEnergyOffset?: number;     // from WeatherSignal.energyOffset
  weatherConfidenceBoost?: number;  // from WeatherSignal.confidenceBoost
  
  // Venue intelligence (optional)
  venueArrived?: boolean;
  venueType?: string | null;
  venueEnergyBase?: number | null;
  venueIntelligence?: VenueIntelligence | null;
  
  // Pattern nudges
  patterns?: {
    hasEnoughData: boolean;
    chronotype: 'lark' | 'owl' | 'balanced';
    energyType: 'high-energy' | 'low-energy' | 'balanced';
    socialType: 'social' | 'solo' | 'balanced';
    consistency: 'very-consistent' | 'consistent' | 'adaptive' | 'highly-adaptive';
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