import { getPercentageBucket } from '@/lib/hash';

/**
 * Environment Detection and Presence Control System
 * 
 * This system provides staged rollout capabilities for transitioning from mock to live presence.
 * It supports URL params, localStorage overrides, and environment variables for flexible testing.
 */

export interface EnvironmentConfig {
  // Presence system mode
  presenceMode: 'offline' | 'mock' | 'live';
  
  // Feature flags
  enableRealtime: boolean;
  enableGeolocation: boolean;
  enablePresenceUpdates: boolean;
  
  // Debug flags
  debugPresence: boolean;
  debugGeohash: boolean;
  debugNetwork: boolean;
  
  // Performance settings
  presenceUpdateInterval: number;
  presenceRetryDelay: number;
  
  // Rollout controls
  rolloutPercentage: number;
  rolloutUserId?: string;
}

/**
 * Determine the current environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  // In production mode, use optimized config
  if (import.meta.env.PROD) {
    return getProductionConfig();
  }
  
  // Check URL parameters first (highest priority)
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check localStorage overrides
  const localStorageMode = localStorage.getItem('floq_presence_mode');
  const localStorageConfig = localStorage.getItem('floq_env_config');
  
  // Parse localStorage config if available
  let localConfig: Partial<EnvironmentConfig> = {};
  try {
    if (localStorageConfig) {
      localConfig = JSON.parse(localStorageConfig);
    }
  } catch (e) {
    console.warn('Invalid localStorage config, ignoring:', e);
  }
  
  // Determine presence mode with priority: URL > localStorage > env var > default
  let presenceMode: 'offline' | 'mock' | 'live' = 'mock'; // default
  
  if (urlParams.get('presence') === 'live') {
    presenceMode = 'live';
  } else if (urlParams.get('presence') === 'offline') {
    presenceMode = 'offline';
  } else if (urlParams.get('presence') === 'mock') {
    presenceMode = 'mock';
  } else if (localStorageMode) {
    presenceMode = localStorageMode as 'offline' | 'mock' | 'live';
  } else if (import.meta.env.NEXT_PUBLIC_OFFLINE_MODE === 'true') {
    presenceMode = 'offline';
  }
  
  // Rollout percentage logic
  const rolloutPercentage = parseFloat(urlParams.get('rollout') || 
    localStorage.getItem('floq_rollout') || 
    import.meta.env.NEXT_PUBLIC_ROLLOUT_PERCENTAGE || 
    '0');
  
  // User-based rollout (for testing specific users)
  const rolloutUserId = urlParams.get('rollout_user') || 
    localStorage.getItem('floq_rollout_user') || 
    undefined;
  
  // Debug flags
  const debugPresence = urlParams.has('debug_presence') || 
    localConfig.debugPresence || 
    import.meta.env.NEXT_PUBLIC_DEBUG_PRESENCE === 'true';
    
  const debugGeohash = urlParams.has('debug_geohash') || 
    localConfig.debugGeohash || 
    import.meta.env.NEXT_PUBLIC_DEBUG_GEOHASH === 'true';
    
  const debugNetwork = urlParams.has('debug_network') || 
    localConfig.debugNetwork || 
    import.meta.env.NEXT_PUBLIC_DEBUG_NETWORK === 'true';
  
  // Performance settings
  const presenceUpdateInterval = parseInt(
    urlParams.get('update_interval') || 
    localConfig.presenceUpdateInterval?.toString() || 
    '10000'
  );
  
  const presenceRetryDelay = parseInt(
    urlParams.get('retry_delay') || 
    localConfig.presenceRetryDelay?.toString() || 
    '5000'
  );
  
  return {
    presenceMode,
    enableRealtime: presenceMode === 'live',
    enableGeolocation: presenceMode !== 'offline',
    enablePresenceUpdates: presenceMode === 'live',
    debugPresence,
    debugGeohash,
    debugNetwork,
    presenceUpdateInterval,
    presenceRetryDelay,
    rolloutPercentage,
    rolloutUserId,
  };
}

/**
 * Check if a user should be included in the rollout
 */
export function isUserInRollout(userId?: string, config?: EnvironmentConfig): boolean {
  const env = config || getEnvironmentConfig();
  
  // Force include specific user
  if (env.rolloutUserId && userId === env.rolloutUserId) {
    return true;
  }
  
  // Percentage-based rollout using djb2 hash
  if (env.rolloutPercentage > 0 && userId) {
    const pct = getPercentageBucket(userId);
    return pct <= env.rolloutPercentage;
  }
  
  return false;
}

/**
 * Set presence mode in localStorage (for testing)
 */
export function setPresenceMode(mode: 'offline' | 'mock' | 'live') {
  localStorage.setItem('floq_presence_mode', mode);
  // Reload to apply changes
  window.location.reload();
}

/**
 * Set environment config in localStorage (for testing)
 */
export function setEnvironmentConfig(config: Partial<EnvironmentConfig>) {
  const current = getEnvironmentConfig();
  const merged = { ...current, ...config };
  localStorage.setItem('floq_env_config', JSON.stringify(merged));
}

/**
 * Clear all environment overrides
 */
export function clearEnvironmentOverrides() {
  localStorage.removeItem('floq_presence_mode');
  localStorage.removeItem('floq_env_config');
  localStorage.removeItem('floq_rollout');
  localStorage.removeItem('floq_rollout_user');
  
  // Remove URL params and reload
  const url = new URL(window.location.href);
  url.searchParams.delete('presence');
  url.searchParams.delete('rollout');
  url.searchParams.delete('rollout_user');
  url.searchParams.delete('debug_presence');
  url.searchParams.delete('debug_geohash');
  url.searchParams.delete('debug_network');
  url.searchParams.delete('update_interval');
  url.searchParams.delete('retry_delay');
  
  window.history.replaceState({}, '', url.toString());
  window.location.reload();
}

/**
 * Log environment info for debugging
 */
export function logEnvironmentInfo() {
  const config = getEnvironmentConfig();
  console.group('🌍 Floq Environment Configuration');
  console.log('Presence Mode:', config.presenceMode);
  console.log('Enable Realtime:', config.enableRealtime);
  console.log('Enable Geolocation:', config.enableGeolocation);
  console.log('Enable Presence Updates:', config.enablePresenceUpdates);
  console.log('Rollout Percentage:', config.rolloutPercentage + '%');
  console.log('Debug Flags:', {
    presence: config.debugPresence,
    geohash: config.debugGeohash,
    network: config.debugNetwork,
  });
  console.log('Performance:', {
    updateInterval: config.presenceUpdateInterval + 'ms',
    retryDelay: config.presenceRetryDelay + 'ms',
  });
  console.groupEnd();
}

// Auto-log environment info in development only
if (import.meta.env.DEV) {
  logEnvironmentInfo();
}

/**
 * Production configuration - optimized for TestFlight
 */
export function getProductionConfig(): EnvironmentConfig {
  return {
    presenceMode: 'live',
    enableRealtime: true,
    enableGeolocation: true,
    enablePresenceUpdates: true,
    debugPresence: false,
    debugGeohash: false,
    debugNetwork: false,
    presenceUpdateInterval: 15000, // 15 seconds for production
    presenceRetryDelay: 5000,
    rolloutPercentage: 100, // 100% rollout for TestFlight
  };
}