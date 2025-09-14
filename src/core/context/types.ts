import type { Vibe } from '@/lib/vibes';

/** A confidence value ∈ [0..1] */
export type Confidence01 = number;

/** Discriminated fact kinds (extend here, never ad-hoc elsewhere) */
export type FactKind =
  | 'temporal'      // time-of-day, weekday, season
  | 'transition'    // (from → to) UI or state transitions
  | 'venue'         // place / POI context
  | 'vibe'          // vibe engine output
  | 'device'        // device/app state (screen on, background)
  | 'weather'       // weather snapshot
  | 'note';         // user/system note (low-risk metadata)

/** Base shape for any fact */
export interface BaseFact {
  kind: FactKind;
  t: number;             // epoch ms
  c?: Confidence01;      // optional confidence
  tags?: string[];       // optional lightweight labels
}

/** Concrete fact payloads */
export interface TemporalFact extends BaseFact {
  kind: 'temporal';
  data: {
    hour: number;        // 0..23
    dayOfWeek: number;   // 0..6
    isWeekend: boolean;
  };
}

export interface TransitionFact extends BaseFact {
  kind: 'transition';
  data: {
    from: string;        // route/screen/state id
    to: string;
    latencyMs?: number;
  };
}

export interface VenueFact extends BaseFact {
  kind: 'venue';
  data: {
    type: string;        // normalized type (coffee, bar, gym, general, ...)
    openNow?: boolean;
    rating?: number;     // 0..5
  };
}

export interface VibeFact extends BaseFact {
  kind: 'vibe';
  data: {
    vibe: Vibe;
    confidence: Confidence01;
    components: Record<string, number>;
  };
}

export interface DeviceFact extends BaseFact {
  kind: 'device';
  data: {
    screenOnRatio01?: number;
    appState?: 'active' | 'background';
  };
}

export interface WeatherFact extends BaseFact {
  kind: 'weather';
  data: {
    isDaylight: boolean;
    condition?: string;        // Clear, Rain, ...
    energyOffset?: number;     // -0.2..+0.2
  };
}

export interface NoteFact extends BaseFact {
  kind: 'note';
  data: {
    text: string;
  };
}

/** Union of all fact payloads */
export type ContextFact =
  | TemporalFact
  | TransitionFact
  | VenueFact
  | VibeFact
  | DeviceFact
  | WeatherFact
  | NoteFact;

/** Fact with stable id (from ledger) */
export type ContextFactWithId = ContextFact & { id: string };

/** Type guards (total; use these in reducers) */
export const isTemporal    = (f: ContextFact): f is TemporalFact    => f.kind === 'temporal';
export const isTransition  = (f: ContextFact): f is TransitionFact  => f.kind === 'transition';
export const isVenue       = (f: ContextFact): f is VenueFact       => f.kind === 'venue';
export const isVibe        = (f: ContextFact): f is VibeFact        => f.kind === 'vibe';
export const isDevice      = (f: ContextFact): f is DeviceFact      => f.kind === 'device';
export const isWeather     = (f: ContextFact): f is WeatherFact     => f.kind === 'weather';
export const isNote        = (f: ContextFact): f is NoteFact        => f.kind === 'note';

/** Synthesized snapshot we expose to UI/engines */
export interface ContextSnapshot {
  t0: number;                        // earliest fact time
  t1: number;                        // latest fact time
  latest?: {
    temporal?: TemporalFact['data'];
    venue?: VenueFact['data'];
    vibe?: VibeFact['data'];
    device?: DeviceFact['data'];
    weather?: WeatherFact['data'];
  };
  transitions: Array<{ from: string; to: string; n: number; avgLatencyMs?: number }>;
  confidence: Confidence01;          // aggregate confidence
}

// Legacy compatibility types for existing components
export interface VibeTransition {
  from: Vibe;
  to: Vibe;
  duration: number;
  confidence: number;
  trigger?: string;
}

export interface VenuePattern {
  venueType: string;
  visitCount: number;
  averageEnergy: number;
  energyImpact: number;
  optimalDuration: number;
}

export interface CorrectionTrend {
  pattern: string;
  frequency: number;
  accuracy: number;
  improvement: number;
}

export interface ContextualInsight {
  id: string;
  text: string;
  confidence: number;
  category: 'temporal' | 'venue' | 'energy' | 'behavioral';
  contextual: boolean;
}

export interface ContextSummary {
  vibeTransitions: VibeTransition[];
  venueSequence: VenuePattern[];
  correctionTrends: CorrectionTrend[];
  contextualInsights: ContextualInsight[];
  factCount: number;
  confidence: number;
  summary: string;
}

// Working set interface (enhanced)
export interface WorkingSet {
  currentSnapshot: ContextSnapshot;
  timestamp: number;
  sessionDuration: number;
}