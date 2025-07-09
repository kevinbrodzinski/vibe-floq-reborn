// Geographic coordinate conversion utilities for the field visualization system
// Converts between GPS lat/lng coordinates and field percentage positioning

export interface Viewport {
  center: [number, number]; // [lat, lng]
  zoom: number; // 1-10 scale
  bounds: [number, number, number, number]; // [west, south, east, north]
}

export interface FieldCoordinate {
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
}

// Base field dimensions in decimal degrees at zoom level 5
const BASE_FIELD_SIZE = {
  width: 0.01,  // ~1.1km at equator
  height: 0.01, // ~1.1km
};

// Zoom scaling factor (each zoom level doubles the visible area)
const ZOOM_SCALE_FACTOR = 2;

/**
 * Calculate the field dimensions for a given zoom level
 */
function getFieldDimensions(zoom: number) {
  const scale = Math.pow(ZOOM_SCALE_FACTOR, 5 - zoom); // zoom 5 is base
  return {
    width: BASE_FIELD_SIZE.width * scale,
    height: BASE_FIELD_SIZE.height * scale,
  };
}

/**
 * Calculate viewport bounds from center and zoom
 */
export function calculateBounds(center: [number, number], zoom: number): [number, number, number, number] {
  const [centerLat, centerLng] = center;
  const dimensions = getFieldDimensions(zoom);
  
  return [
    centerLng - dimensions.width / 2,  // west
    centerLat - dimensions.height / 2, // south
    centerLng + dimensions.width / 2,  // east
    centerLat + dimensions.height / 2, // north
  ];
}

/**
 * Convert GPS coordinates to field percentage coordinates
 */
export function latLngToField(
  lat: number, 
  lng: number, 
  viewport: Viewport
): FieldCoordinate {
  const [west, south, east, north] = viewport.bounds;
  
  // Convert to percentage within the viewport bounds
  const x = ((lng - west) / (east - west)) * 100;
  const y = ((north - lat) / (north - south)) * 100; // Flip Y axis (north = 0%)
  
  // Clamp to field boundaries
  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  };
}

/**
 * Convert field percentage coordinates to GPS coordinates
 */
export function fieldToLatLng(
  fieldX: number, 
  fieldY: number, 
  viewport: Viewport
): [number, number] {
  const [west, south, east, north] = viewport.bounds;
  
  // Convert from percentage to actual coordinates
  const lng = west + (fieldX / 100) * (east - west);
  const lat = north - (fieldY / 100) * (north - south); // Flip Y axis
  
  return [lat, lng];
}

/**
 * Convert meters to field percentage for radius rendering
 */
export function mToPercent(meters: number, viewport: Viewport): number {
  const dimensions = getFieldDimensions(viewport.zoom);
  const fieldWidthMeters = dimensions.width * 111320; // 1 degree ≈ 111.32km at equator
  
  // Convert meters to percentage of field width
  return (meters / fieldWidthMeters) * 100;
}

/**
 * Calculate distance between two GPS coordinates in meters
 */
export function calculateDistance(
  lat1: number, lng1: number, 
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if GPS coordinates are within viewport bounds
 */
export function isInViewport(lat: number, lng: number, viewport: Viewport): boolean {
  const [west, south, east, north] = viewport.bounds;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}