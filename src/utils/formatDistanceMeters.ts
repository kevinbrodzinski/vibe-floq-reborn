/**
 * Format distance in meters to a human-readable string
 */
export function formatDistanceMeters(meters: number): string {
  if (meters < 1) {
    return "<1 m";
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  
  const km = meters / 1000;
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }
  
  return `${Math.round(km)} km`;
}