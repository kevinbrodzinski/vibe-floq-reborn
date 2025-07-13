/**
 * Format distance in meters to a human-readable string
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    const km = meters / 1000;
    if (km < 10) {
      return `${km.toFixed(1)}km`;
    } else {
      return `${Math.round(km)}km`;
    }
  }
}