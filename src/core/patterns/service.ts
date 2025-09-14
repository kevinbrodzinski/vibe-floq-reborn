import { storage } from "@/lib/storage";
import {
  STORAGE_KEYS, V1, VenueImpacts, TemporalPrefs, EnhancedSequenceMap, PersonalityProfile,
  SocialContextPatterns, VenueClusters, PersonalitySnapshot,
  EMPTY_VENUE_IMPACTS, EMPTY_TEMPORAL_PREFS, EMPTY_SEQUENCES, EMPTY_PROFILE, EMPTY_SOCIAL, EMPTY_CLUSTERS, EMPTY_TIMELINE
} from "./store";

// telemetry
let writes = 0; 
export const getPatternTelemetry = () => ({ writes, enabled: import.meta.env.VITE_VIBE_PATTERNS !== "off" });

const getJSON = async <T>(k: string, fb: T) => { 
  try { 
    const s = await storage.getItem(k); 
    return s ? JSON.parse(s) : fb;
  } catch { 
    return fb;
  }
};

const setJSON = async <T>(k: string, v: T) => { 
  try { 
    await storage.setJSON(k, v); 
    writes++;
  } catch {}
};

// venue impacts
export const readVenueImpacts = async (): Promise<V1<VenueImpacts>> => getJSON(STORAGE_KEYS.VENUE, EMPTY_VENUE_IMPACTS);
export const writeVenueImpacts = async (v: V1<VenueImpacts>) => (v.updatedAt = Date.now(), setJSON(STORAGE_KEYS.VENUE, v));
export const getCachedVenueImpacts = readVenueImpacts; // alias for backward compatibility

// temporal prefs
export const readTemporalPrefs = async (): Promise<V1<TemporalPrefs>> => getJSON(STORAGE_KEYS.TEMPORAL, EMPTY_TEMPORAL_PREFS);
export const writeTemporalPrefs = async (v: V1<TemporalPrefs>) => (v.updatedAt = Date.now(), setJSON(STORAGE_KEYS.TEMPORAL, v));
export const getCachedTemporalPrefs = readTemporalPrefs; // alias for backward compatibility

// sequences
export const readSequences = async (): Promise<V1<EnhancedSequenceMap>> => getJSON(STORAGE_KEYS.SEQUENCES, EMPTY_SEQUENCES);
export const writeSequences = async (v: V1<EnhancedSequenceMap>) => (v.updatedAt = Date.now(), setJSON(STORAGE_KEYS.SEQUENCES, v));

// profile
export const readProfile = async (): Promise<V1<PersonalityProfile>> => getJSON(STORAGE_KEYS.PROFILE, EMPTY_PROFILE);
export const writeProfile = async (v: V1<PersonalityProfile>) => (v.updatedAt = Date.now(), setJSON(STORAGE_KEYS.PROFILE, v));
export const getCachedProfile = readProfile; // alias for backward compatibility

// social
export const readSocial = async (): Promise<V1<SocialContextPatterns>> => getJSON(STORAGE_KEYS.SOCIAL, EMPTY_SOCIAL);
export const writeSocial = async (v: V1<SocialContextPatterns>) => (v.updatedAt = Date.now(), setJSON(STORAGE_KEYS.SOCIAL, v));

// clusters
export const readClusters = async (): Promise<V1<VenueClusters>> => getJSON(STORAGE_KEYS.CLUSTERS, EMPTY_CLUSTERS);
export const writeClusters = async (v: V1<VenueClusters>) => (v.updatedAt = Date.now(), setJSON(STORAGE_KEYS.CLUSTERS, v));

// timeline
export const readTimeline = async (): Promise<V1<PersonalitySnapshot[]>> => getJSON(STORAGE_KEYS.TIMELINE, EMPTY_TIMELINE);
export const writeTimeline = async (v: V1<PersonalitySnapshot[]>) => (v.updatedAt = Date.now(), setJSON(STORAGE_KEYS.TIMELINE, v));

// Read all patterns (for insights panel)
export const readAllPatterns = async () => {
  const [venue, temporal, sequences, profile, social, clusters, timeline] = await Promise.all([
    readVenueImpacts(),
    readTemporalPrefs(),
    readSequences(),
    readProfile(),
    readSocial(),
    readClusters(),
    readTimeline()
  ]);
  
  return { venue, temporal, sequences, profile, social, clusters, timeline };
};

// Cleanup old patterns
export const cleanupOldPatterns = async (maxAgeMs = 90 * 24 * 60 * 60 * 1000) => {
  try {
    const cutoff = Date.now() - maxAgeMs;
    
    // Clean up sequences with old lastSeen timestamps
    const sequences = await readSequences();
    let cleaned = false;
    
    Object.keys(sequences.data).forEach(key => {
      if (sequences.data[key].lastSeen < cutoff) {
        delete sequences.data[key];
        cleaned = true;
      }
    });
    
    if (cleaned) {
      await writeSequences(sequences);
    }
  } catch (error) {
    console.warn('Failed to cleanup old patterns:', error);
  }
};

// Invalidate pattern cache (no-op since we don't cache)
export const invalidatePatternCache = () => {
  // No-op - we read from storage directly
};