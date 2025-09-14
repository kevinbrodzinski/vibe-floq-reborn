// Pattern persistence service with cross-platform storage
import { storage } from '@/lib/storage';
import type { 
  V1, 
  VenueImpacts, 
  TemporalPrefs, 
  SequenceMap, 
  PersonalityProfile,
} from './store';
import { 
  STORAGE_KEYS,
  EMPTY_VENUE_IMPACTS,
  EMPTY_TEMPORAL_PREFS, 
  EMPTY_SEQUENCES,
  EMPTY_PROFILE
} from './store';

// Generic JSON storage helpers
async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const stored = await storage.getItem(key);
    if (!stored) return fallback;
    return JSON.parse(stored);
  } catch {
    return fallback;
  }
}

async function setJSON<T>(key: string, value: T): Promise<void> {
  try {
    await storage.setItem(key, JSON.stringify(value));
  } catch {
    // Fail silently - patterns are enhancement, not critical
  }
}

// Venue impact patterns
export async function readVenueImpacts(): Promise<V1<VenueImpacts>> {
  return getJSON(STORAGE_KEYS.VENUE, EMPTY_VENUE_IMPACTS);
}

export async function writeVenueImpacts(impacts: V1<VenueImpacts>): Promise<void> {
  impacts.updatedAt = Date.now();
  await setJSON(STORAGE_KEYS.VENUE, impacts);
}

// Temporal preference patterns  
export async function readTemporalPrefs(): Promise<V1<TemporalPrefs>> {
  return getJSON(STORAGE_KEYS.TEMPORAL, EMPTY_TEMPORAL_PREFS);
}

export async function writeTemporalPrefs(prefs: V1<TemporalPrefs>): Promise<void> {
  prefs.updatedAt = Date.now();
  await setJSON(STORAGE_KEYS.TEMPORAL, prefs);
}

// Sequence patterns
export async function readSequences(): Promise<V1<SequenceMap>> {
  return getJSON(STORAGE_KEYS.SEQUENCES, EMPTY_SEQUENCES);
}

export async function writeSequences(sequences: V1<SequenceMap>): Promise<void> {
  sequences.updatedAt = Date.now();
  await setJSON(STORAGE_KEYS.SEQUENCES, sequences);
}

// Personality profile
export async function readProfile(): Promise<V1<PersonalityProfile>> {
  return getJSON(STORAGE_KEYS.PROFILE, EMPTY_PROFILE);
}

export async function writeProfile(profile: V1<PersonalityProfile>): Promise<void> {
  profile.updatedAt = Date.now();
  await setJSON(STORAGE_KEYS.PROFILE, profile);
}

// Batch operations for efficiency
export async function readAllPatterns() {
  const [venue, temporal, sequences, profile] = await Promise.all([
    readVenueImpacts(),
    readTemporalPrefs(), 
    readSequences(),
    readProfile()
  ]);
  
  return { venue, temporal, sequences, profile };
}

// Cache for performance (patterns don't change frequently)
let patternCache = {
  venue: { v: undefined as V1<VenueImpacts>|undefined, t: 0 },
  temporal: { v: undefined as V1<TemporalPrefs>|undefined, t: 0 },
  profile: { v: undefined as V1<PersonalityProfile>|undefined, t: 0 },
};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getCachedVenueImpacts(): Promise<V1<VenueImpacts>> {
  const now = Date.now();
  if (!patternCache.venue.v || now - patternCache.venue.t > CACHE_TTL_MS) {
    patternCache.venue.v = await readVenueImpacts();
    patternCache.venue.t = now;
  }
  return patternCache.venue.v!;
}

export async function getCachedTemporalPrefs(): Promise<V1<TemporalPrefs>> {
  const now = Date.now();
  if (!patternCache.temporal.v || now - patternCache.temporal.t > CACHE_TTL_MS) {
    patternCache.temporal.v = await readTemporalPrefs();
    patternCache.temporal.t = now;
  }
  return patternCache.temporal.v!;
}

export async function getCachedProfile(): Promise<V1<PersonalityProfile>> {
  const now = Date.now();
  if (!patternCache.profile.v || now - patternCache.profile.t > CACHE_TTL_MS) {
    patternCache.profile.v = await readProfile();
    patternCache.profile.t = now;
  }
  return patternCache.profile.v!;
}

// Invalidate cache when patterns are updated
export function invalidatePatternCache(): void {
  patternCache = { venue:{v:undefined,t:0}, temporal:{v:undefined,t:0}, profile:{v:undefined,t:0} };
}

// Cleanup old pattern data (for periodic maintenance)
export async function cleanupOldPatterns(maxAgeMs = 90 * 24 * 60 * 60 * 1000): Promise<void> {
  const cutoff = Date.now() - maxAgeMs;
  
  try {
    const patterns = await readAllPatterns();
    let cleaned = false;
    
    // Remove venue impacts older than cutoff with low sample count
    Object.keys(patterns.venue.data).forEach(venueType => {
      const impact = patterns.venue.data[venueType];
      if (impact && impact.sampleN < 5 && patterns.venue.updatedAt < cutoff) {
        delete patterns.venue.data[venueType];
        cleaned = true;
      }
    });
    
    if (cleaned) {
      await writeVenueImpacts(patterns.venue);
      invalidatePatternCache();
    }
  } catch {
    // Cleanup is not critical
  }
}