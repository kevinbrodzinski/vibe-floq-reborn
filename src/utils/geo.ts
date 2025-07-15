/**
 * Calculate the distance between two geographic points using the Haversine formula
 * @param a First point with lat/lng coordinates
 * @param b Second point with lat/lng coordinates
 * @returns Distance in meters
 */
export const distance = (
  a: { lat: number; lng: number }, 
  b: { lat: number; lng: number }
): number => {
  const R = 6371000 // Earth's radius in meters
  const φ1 = (a.lat * Math.PI) / 180
  const φ2 = (b.lat * Math.PI) / 180
  const Δφ = φ2 - φ1
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180

  const d = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(d))
}

/**
 * Check if a point is within a certain distance of another point
 * @param center Center point
 * @param target Target point to check
 * @param radiusMeters Radius in meters
 * @returns True if target is within radius of center
 */
export const isWithinRadius = (
  center: { lat: number; lng: number },
  target: { lat: number; lng: number },
  radiusMeters: number
): boolean => {
  return distance(center, target) <= radiusMeters
}