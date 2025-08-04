/**
 * Feature flags for location system v2
 * Allows safe rollout and quick rollback
 */

interface FeatureFlags {
  locationV2Enabled: boolean;
  presenceBatchingEnabled: boolean;
  debugLocation: boolean;
}

// Default flags - start with v2 disabled for safety
const DEFAULT_FLAGS: FeatureFlags = {
  locationV2Enabled: false,
  presenceBatchingEnabled: true,
  debugLocation: process.env.NODE_ENV === 'development'
};

// Feature flags (could be loaded from Supabase config table in future)
let flags: FeatureFlags = { ...DEFAULT_FLAGS };

export function getFeatureFlags(): FeatureFlags {
  return { ...flags };
}

export function setFeatureFlag<K extends keyof FeatureFlags>(
  key: K, 
  value: FeatureFlags[K]
): void {
  flags[key] = value;
  console.log(`[FeatureFlags] Set ${key} = ${value}`);
}

export function isLocationV2Enabled(): boolean {
  return flags.locationV2Enabled;
}

export function enableLocationV2(): void {
  setFeatureFlag('locationV2Enabled', true);
}

export function disableLocationV2(): void {
  setFeatureFlag('locationV2Enabled', false);
}