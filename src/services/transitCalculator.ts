// Transit time calculation service with multiple providers
import type { PlanStopUi } from '@/types/plan';

export interface TransitOptions {
  mode: 'walking' | 'driving' | 'transit' | 'auto';
  optimize: boolean;
}

export interface TransitResult {
  duration_minutes: number;
  distance_meters: number;
  mode: string;
  confidence: 'high' | 'medium' | 'low';
  provider: string;
}

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

// Fallback estimates based on distance and mode
const getFallbackEstimate = (
  from: Location, 
  to: Location, 
  mode: TransitOptions['mode']
): TransitResult => {
  const distance = getDistanceInMeters(from, to);
  
  const speedMap = {
    walking: 1.4, // m/s (5 km/h)
    driving: 11.1, // m/s (40 km/h average city driving)
    transit: 8.3,  // m/s (30 km/h average including stops)
    auto: 11.1     // default to driving
  };
  
  const speed = speedMap[mode] || speedMap.auto;
  const baseTime = distance / speed / 60; // minutes
  
  // Add buffer for stops, traffic, etc.
  const bufferMultiplier = {
    walking: 1.1,
    driving: 1.3,
    transit: 1.5,
    auto: 1.3
  };
  
  const duration = Math.max(5, Math.round(baseTime * bufferMultiplier[mode]));
  
  return {
    duration_minutes: duration,
    distance_meters: Math.round(distance),
    mode,
    confidence: distance < 1000 ? 'high' : distance < 5000 ? 'medium' : 'low',
    provider: 'fallback'
  };
};

// Haversine formula for distance calculation
const getDistanceInMeters = (from: Location, to: Location): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = from.lat * Math.PI / 180;
  const φ2 = to.lat * Math.PI / 180;
  const Δφ = (to.lat - from.lat) * Math.PI / 180;
  const Δλ = (to.lng - from.lng) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

// Extract coordinates from venue/stop data
const getLocationFromStop = (stop: PlanStopUi): Location | null => {
  // Try to get coordinates from venue data (if venue has lat/lng properties)
  const venue = stop.venue as any; // Type assertion for venue coordinates
  if (venue?.lat && venue?.lng) {
    return {
      lat: venue.lat,
      lng: venue.lng,
      address: venue.address || venue.name
    };
  }
  
  // Fallback to address geocoding (placeholder - would need real geocoding service)
  if (stop.address || stop.venue?.address) {
    // In a real implementation, you'd geocode the address here
    // For now, return null to indicate we can't calculate
    return null;
  }
  
  return null;
};

/**
 * Calculate transit time between two stops
 */
export const calculateTransitTime = async (
  fromStop: PlanStopUi,
  toStop: PlanStopUi,
  options: TransitOptions = { mode: 'auto', optimize: false }
): Promise<TransitResult> => {
  const fromLocation = getLocationFromStop(fromStop);
  const toLocation = getLocationFromStop(toStop);
  
  // If we can't get coordinates, return a conservative estimate
  if (!fromLocation || !toLocation) {
    return {
      duration_minutes: 15,
      distance_meters: 1000,
      mode: options.mode,
      confidence: 'low',
      provider: 'estimate'
    };
  }
  
  try {
    // In a real implementation, you'd call a routing service here
    // For now, use our fallback calculation
    return getFallbackEstimate(fromLocation, toLocation, options.mode);
  } catch (error) {
    console.warn('Transit calculation failed, using fallback:', error);
    return getFallbackEstimate(fromLocation, toLocation, options.mode);
  }
};

/**
 * Calculate optimal route through multiple stops
 */
export const calculateOptimalRoute = async (
  stops: PlanStopUi[],
  options: TransitOptions = { mode: 'auto', optimize: true }
): Promise<{
  stops: PlanStopUi[];
  totalDuration: number;
  totalDistance: number;
  transitTimes: TransitResult[];
}> => {
  if (stops.length < 2) {
    return {
      stops,
      totalDuration: 0,
      totalDistance: 0,
      transitTimes: []
    };
  }
  
  // For now, keep stops in order (TSP optimization would be complex)
  // In a real implementation, you might use a routing optimization service
  const transitTimes: TransitResult[] = [];
  let totalDuration = 0;
  let totalDistance = 0;
  
  for (let i = 0; i < stops.length - 1; i++) {
    const transit = await calculateTransitTime(stops[i], stops[i + 1], options);
    transitTimes.push(transit);
    totalDuration += transit.duration_minutes;
    totalDistance += transit.distance_meters;
  }
  
  return {
    stops,
    totalDuration,
    totalDistance,
    transitTimes
  };
};

/**
 * Get real-time transit updates
 */
export const getTransitUpdates = async (
  transitResult: TransitResult
): Promise<TransitResult> => {
  // In a real implementation, you'd check for live traffic/transit conditions
  // For now, just return the original result
  return {
    ...transitResult,
    // Add small random variance to simulate real conditions
    duration_minutes: Math.round(transitResult.duration_minutes * (0.9 + Math.random() * 0.3))
  };
};

/**
 * Format transit result for display
 */
export const formatTransitResult = (result: TransitResult): string => {
  const { duration_minutes, distance_meters, mode, confidence } = result;
  
  const distanceText = distance_meters < 1000 
    ? `${Math.round(distance_meters)}m`
    : `${(distance_meters / 1000).toFixed(1)}km`;
  
  const modeText = {
    walking: '🚶',
    driving: '🚗',
    transit: '🚌',
    auto: '🚗'
  }[mode] || '🚗';
  
  const confidenceText = confidence === 'low' ? '~' : '';
  
  return `${modeText} ${confidenceText}${duration_minutes}min • ${distanceText}`;
};
