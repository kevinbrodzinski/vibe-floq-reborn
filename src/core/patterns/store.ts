// Pattern storage types with versioning for clean evolution
import type { Vibe } from '@/lib/vibes';

export type V1<T> = { 
  version: 1; 
  updatedAt: number; 
  data: T;
};

// Venue impacts per venue type (learned from user behavior)
export type VenueImpacts = Record<string, {
  sampleN: number;
  energyDelta: number;          // -1..+1 (EWMA average impact on energy)
  preferredVibes: Partial<Record<Vibe, number>>; // normalized distribution
  optimalDwellMin: number;      // sweet-spot dwell time
}>;

// Hour-of-day (0..23) → vibe distribution preferences
export type TemporalPrefs = Record<number, Partial<Record<Vibe, number>>>;

// Light sequence mapping: "A→B" outcome distribution + average time
export type SequenceMap = Record<string, {
  next: Partial<Record<Vibe, number>>;
  avgMinutes: number;
  sampleN: number;
}>;

// Persistent personality profile (evolves slowly)
export type PersonalityProfile = {
  energyPreference: number;     // -1..+1 (low to high energy tendency)
  socialPreference: number;     // -1..+1 (solo to social tendency)  
  chronotype: 'lark' | 'owl' | 'balanced';
  consistency01: number;        // 0..1 (how consistent user's patterns are)
  updatedAt: number;
  sampleCount: number;          // number of sessions contributing to profile
};

// Storage keys (versioned for clean migration)
export const STORAGE_KEYS = {
  VENUE: 'pattern:venue:v1',
  TEMPORAL: 'pattern:temporal:v1', 
  SEQUENCES: 'pattern:sequences:v1',
  PROFILE: 'pattern:profile:v1'
} as const;

// Default empty states
export const EMPTY_VENUE_IMPACTS: V1<VenueImpacts> = {
  version: 1,
  updatedAt: 0,
  data: {}
};

export const EMPTY_TEMPORAL_PREFS: V1<TemporalPrefs> = {
  version: 1,
  updatedAt: 0,
  data: {}
};

export const EMPTY_SEQUENCES: V1<SequenceMap> = {
  version: 1,
  updatedAt: 0,
  data: {}
};

export const EMPTY_PROFILE: V1<PersonalityProfile> = {
  version: 1,
  updatedAt: 0,
  data: {
    energyPreference: 0,
    socialPreference: 0,
    chronotype: 'balanced',
    consistency01: 0.5,
    updatedAt: 0,
    sampleCount: 0
  }
};