// Pattern storage types with versioning for clean evolution
import type { Vibe } from '@/lib/vibes';

export type V1<T> = { 
  version: 1; 
  updatedAt: number; 
  data: T;
};

// GPS-based venue clustering for missing venue intelligence
export type VenueCluster = {
  id: string; // H3 geohash  
  center: { lat: number; lng: number };
  radius: number; // meters
  visitCount: number;
  totalDwellMin: number;
  userLabel?: string; // "My favorite coffee spot"
  confidence: number; // 0-1
  lastVisit: number;
  energyDelta: number; // learned energy impact
  preferredVibes: Partial<Record<Vibe, number>>;
};

// Social context patterns (alone vs with friends)
export type SocialContext = 'alone' | 'with-friend' | 'small-group' | 'large-group';

export type SocialContextPatterns = Record<SocialContext, {
  sampleN: number;
  energyBoost: number; // -1..+1  
  preferredVibes: Partial<Record<Vibe, number>>;
  avgSessionMin: number;
}>;

// Enhanced sequence learning with confidence and time sensitivity
export type EnhancedSequenceMap = Record<string, {
  next: Partial<Record<Vibe, number>>; // outcome distribution
  confidence: number; // 0-1
  avgMinutes: number; // time between venues
  sampleN: number;
  lastSeen: number; // for decay
  timeOfDay?: number; // hour when sequence typically occurs
}>;

// Personality evolution timeline  
export type PersonalitySnapshot = {
  timestamp: number;
  energyPreference: number;
  socialPreference: number;
  chronotype: 'lark' | 'owl' | 'balanced';
  consistency01: number;
  sampleCount: number;
  contextInfo: {
    totalVenues: number;
    dominantVenueTypes: string[];
    socialSessionRatio: number; // % of time with others
  };
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
  PROFILE: 'pattern:profile:v1',
  GPS_CLUSTERS: 'pattern:gps-clusters:v1',
  SOCIAL_CONTEXT: 'pattern:social-context:v1',
  PERSONALITY_TIMELINE: 'pattern:personality-timeline:v1'
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

export const EMPTY_SEQUENCES: V1<EnhancedSequenceMap> = {
  version: 1,
  updatedAt: 0,
  data: {}
};

export const EMPTY_GPS_CLUSTERS: V1<Record<string, VenueCluster>> = {
  version: 1,
  updatedAt: 0,
  data: {}
};

export const EMPTY_SOCIAL_CONTEXT: V1<SocialContextPatterns> = {
  version: 1,
  updatedAt: 0,
  data: {
    alone: { sampleN: 0, energyBoost: 0, preferredVibes: {}, avgSessionMin: 0 },
    'with-friend': { sampleN: 0, energyBoost: 0, preferredVibes: {}, avgSessionMin: 0 },
    'small-group': { sampleN: 0, energyBoost: 0, preferredVibes: {}, avgSessionMin: 0 },
    'large-group': { sampleN: 0, energyBoost: 0, preferredVibes: {}, avgSessionMin: 0 }
  }
};

export const EMPTY_TIMELINE: V1<PersonalitySnapshot[]> = {
  version: 1,
  updatedAt: 0,
  data: []
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