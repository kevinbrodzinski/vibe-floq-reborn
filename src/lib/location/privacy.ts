/**
 * Location privacy utilities for coordinate snapping
 */

export interface SnappedCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

/**
 * Snap coordinates to a grid based on accuracy level
 * @param lat - Original latitude
 * @param lng - Original longitude  
 * @param accuracyLevel - 'exact', 'street', or 'area'
 * @param originalAccuracy - Original GPS accuracy in meters
 */
export const snapToGrid = (
  lat: number, 
  lng: number, 
  accuracyLevel: 'exact' | 'street' | 'area',
  originalAccuracy: number
): SnappedCoords => {
  if (accuracyLevel === 'exact') {
    return { lat, lng, accuracy: originalAccuracy };
  }

  let gridSize: number;
  let minAccuracy: number;

  if (accuracyLevel === 'street') {
    gridSize = 100; // 100m grid
    minAccuracy = 100;
  } else { // area
    gridSize = 1000; // 1km grid  
    minAccuracy = 1000;
  }

  // Convert meters to degrees (approximate)
  const deltaLat = gridSize / 111320; // ~111320 meters per degree latitude
  const deltaLng = gridSize / (111320 * Math.cos(lat * Math.PI / 180)); // longitude varies by latitude

  // Snap to grid
  const snappedLat = Math.round(lat / deltaLat) * deltaLat;
  const snappedLng = Math.round(lng / deltaLng) * deltaLng;

  return {
    lat: snappedLat,
    lng: snappedLng,
    accuracy: Math.max(originalAccuracy, minAccuracy)
  };
};

/**
 * Apply privacy filtering to coordinates based on user settings
 */
export const applyPrivacyFilter = (
  lat: number,
  lng: number, 
  accuracy: number,
  liveSettings: any
): SnappedCoords => {
  const accuracyLevel = liveSettings?.live_accuracy ?? 'exact';
  return snapToGrid(lat, lng, accuracyLevel, accuracy);
};