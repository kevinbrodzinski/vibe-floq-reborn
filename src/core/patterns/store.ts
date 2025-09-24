import type { Vibe } from '@/lib/vibes';

export type V1<T> = { 
  version: 1; 
  updatedAt: number; 
  data: T;
};

// ── Core pattern records ─────────────────────────────────────────────
export type VenueImpacts = Record<
  string,
  { sampleN: number; energyDelta: number; preferredVibes: Partial<Record<Vibe, number>>; optimalDwellMin: number }
>;
export type TemporalPrefs = Record<number, Partial<Record<Vibe, number>>>;
export type EnhancedSequenceMap = Record<
  string,
  { next: Partial<Record<Vibe, number>>; confidence: number; avgMinutes: number; sampleN: number; lastSeen: number }
>;

export type SocialContext = 'alone' | 'with-friend' | 'small-group' | 'large-group';
export type SocialContextPatterns = Record<
  SocialContext,
  { sampleN: number; energyBoost: number; preferredVibes: Partial<Record<Vibe, number>>; avgSessionMin: number }
>;

export type VenueCluster = {
  id: string;
  center: { lat: number; lng: number };
  radiusM: number;
  visitCount: number;
  totalDwellMin: number;
  userLabel?: string;
  confidence01: number;
  lastVisit: number;
  dominantVibe?: Vibe;
};
export type VenueClusters = Record<string, VenueCluster>;

export type PersonalitySnapshot = {
  timestamp: number;
  energyPreference: number;
  socialPreference: number;
  chronotype: 'lark' | 'owl' | 'balanced';
  consistency01: number;
  sampleCount: number;
  contextInfo: { totalVenues: number; dominantVenueTypes: string[]; socialSessionRatio: number };
};

// Persistent personality profile (evolves slowly)
export type PersonalityProfile = {
  energyPreference: number;     // -1..+1 (low to high energy tendency)
  socialPreference: number;     // -1..+1 (solo to social tendency)  
  chronotype: 'lark' | 'owl' | 'balanced';
  consistency01: number;        // 0..1 (how consistent user's patterns are)
  updatedAt: number;
  sampleCount: number;          // number of sessions contributing to profile
};

// ── Storage keys (single source of truth) ────────────────────────────────────
export const STORAGE_KEYS = {
  VENUE: 'pattern:venue:v1',
  TEMPORAL: 'pattern:temporal:v1', 
  SEQUENCES: 'pattern:sequences:v1',
  PROFILE: 'pattern:profile:v1',
  SOCIAL: 'pattern:social:v1',
  CLUSTERS: 'pattern:clusters:v1',
  TIMELINE: 'pattern:timeline:v1'
} as const;

// ── Empty envelopes ──────────────────────────────────────────────────
export const EMPTY_VENUE_IMPACTS: V1<VenueImpacts> = { version: 1, updatedAt: 0, data: {} };
export const EMPTY_TEMPORAL_PREFS: V1<TemporalPrefs> = { version: 1, updatedAt: 0, data: {} };
export const EMPTY_SEQUENCES: V1<EnhancedSequenceMap> = { version: 1, updatedAt: 0, data: {} };
export const EMPTY_PROFILE: V1<PersonalityProfile> = {
  version: 1, updatedAt: 0,
  data: { energyPreference: 0, socialPreference: 0, chronotype: 'balanced', consistency01: 0.5, updatedAt: 0, sampleCount: 0 }
};
export const EMPTY_SOCIAL: V1<SocialContextPatterns> = {
  version: 1, updatedAt: 0,
  data: {
    'alone': { sampleN:0, energyBoost:0, preferredVibes:{}, avgSessionMin:0 },
    'with-friend': { sampleN:0, energyBoost:0, preferredVibes:{}, avgSessionMin:0 },
    'small-group': { sampleN:0, energyBoost:0, preferredVibes:{}, avgSessionMin:0 },
    'large-group': { sampleN:0, energyBoost:0, preferredVibes:{}, avgSessionMin:0 },
  }
};
export const EMPTY_CLUSTERS: V1<VenueClusters> = { version: 1, updatedAt: 0, data: {} };
export const EMPTY_TIMELINE: V1<PersonalitySnapshot[]> = { version: 1, updatedAt: 0, data: [] };