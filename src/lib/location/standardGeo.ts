/**
 * Standardized location utilities with consistent coordinate formats and calculations
 * This replaces multiple scattered implementations with a single source of truth.
 */

// Standard coordinate types
export interface GPSCoords {
  lat: number;
  lng: number;
}

// Canonical GPS type for consistent usage across the app
export type GPS = GPSCoords;

export type GeoJSONCoords = [number, number]; // [lng, lat] - GeoJSON standard

/**
 * Haversine distance calculation - single implementation for all distance calculations
 * @param from GPS coordinates {lat, lng}
 * @param to GPS coordinates {lat, lng}  
 * @returns Distance in meters
 */
export function calculateDistance(from: GPSCoords, to: GPSCoords): number {
  const R = 6371000; // Earth's radius in meters
  
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δφ = ((to.lat - from.lat) * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;

  const a = 
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check if a point is within a radius of another point
 * @param center Center point {lat, lng}
 * @param target Target point {lat, lng}
 * @param radiusMeters Radius in meters
 * @returns True if target is within radius
 */
export function isWithinRadius(
  center: GPSCoords,
  target: GPSCoords, 
  radiusMeters: number
): boolean {
  return calculateDistance(center, target) <= radiusMeters;
}

/**
 * Convert GPS coordinates to GeoJSON format
 * @internal
 * @param coords GPS coordinates {lat, lng}
 * @returns GeoJSON coordinates [lng, lat]
 */
export function toGeoJSON(coords: GPSCoords): GeoJSONCoords {
  return [coords.lng, coords.lat];
}

/**
 * Convert GeoJSON coordinates to GPS format
 * @internal
 * @param coords GeoJSON coordinates [lng, lat]
 * @returns GPS coordinates {lat, lng}
 */
export function fromGeoJSON(coords: GeoJSONCoords): GPSCoords {
  return { lng: coords[0], lat: coords[1] };
}

/**
 * Format distance for display
 * @param meters Distance in meters
 * @returns Formatted string (e.g. "150m" or "2.3km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Validate GPS coordinates
 * @internal
 * @param coords GPS coordinates to validate
 * @returns True if coordinates are valid
 */
export function isValidGPSCoords(coords: GPSCoords): boolean {
  return (
    coords.lat >= -90 && coords.lat <= 90 &&
    coords.lng >= -180 && coords.lng <= 180 &&
    !isNaN(coords.lat) && !isNaN(coords.lng)
  );
}

/**
 * Validate GeoJSON coordinates
 * @internal
 * @param coords GeoJSON coordinates to validate  
 * @returns True if coordinates are valid
 */
export function isValidGeoJSONCoords(coords: GeoJSONCoords): boolean {
  const [lng, lat] = coords;
  return (
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) && !isNaN(lng)
  );
}

// Legacy compatibility exports - mark as deprecated
let deprecationWarned = false;

/** @deprecated Use calculateDistance instead */
export const metersBetween = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  if (!deprecationWarned) {
    // eslint-disable-next-line no-console
    console.warn('⚠️ metersBetween is deprecated. Use calculateDistance from @/lib/location/standardGeo instead.');
    deprecationWarned = true;
  }
  return calculateDistance({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
};

/** @deprecated Use calculateDistance instead */
export const distance = (a: GPSCoords, b: GPSCoords): number => {
  if (!deprecationWarned) {
    // eslint-disable-next-line no-console
    console.warn('⚠️ distance is deprecated. Use calculateDistance from @/lib/location/standardGeo instead.');
    deprecationWarned = true;
  }
  return calculateDistance(a, b);
};