// Migration scaffolding for pattern schema evolution
import type { V1, VenueImpacts, TemporalPrefs, PersonalityProfile } from './store';
import { EMPTY_VENUE_IMPACTS, EMPTY_TEMPORAL_PREFS, EMPTY_PROFILE } from './store';

export function migrateVenueImpacts(obj: any): V1<VenueImpacts> {
  if (!obj || typeof obj !== 'object') return EMPTY_VENUE_IMPACTS;
  if (obj.version === 1) return obj;
  // future: add v0->v1 transformations here
  return { ...EMPTY_VENUE_IMPACTS, updatedAt: Date.now() };
}

export function migrateTemporalPrefs(obj: any): V1<TemporalPrefs> {
  if (!obj || typeof obj !== 'object') return EMPTY_TEMPORAL_PREFS;
  if (obj.version === 1) return obj;
  // future: add v0->v1 transformations here
  return { ...EMPTY_TEMPORAL_PREFS, updatedAt: Date.now() };
}

export function migrateProfile(obj: any): V1<PersonalityProfile> {
  if (!obj || typeof obj !== 'object') return EMPTY_PROFILE;
  if (obj.version === 1) return obj;
  // future: add v0->v1 transformations here
  return { ...EMPTY_PROFILE, updatedAt: Date.now() };
}