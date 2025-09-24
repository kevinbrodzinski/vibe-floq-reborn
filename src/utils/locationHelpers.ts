// Helper functions for location and distance calculations
import { calculateDistance as standardCalculateDistance, fromGeoJSON, type GPSCoords, formatDistance as standardFormatDistance } from '@/lib/location/standardGeo';

export interface Coordinates {
  lng: number
  lat: number
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param coords1 First coordinate pair [lng, lat] (GeoJSON format)
 * @param coords2 Second coordinate pair [lng, lat] (GeoJSON format)
 * @returns Distance in meters
 */
export function calculateDistance(coords1: [number, number], coords2: [number, number]): number {
  // Convert GeoJSON [lng, lat] to GPS {lat, lng} format
  const from = fromGeoJSON(coords1);
  const to = fromGeoJSON(coords2);
  return standardCalculateDistance(from, to);
}

/**
 * Calculate distances between sequential moments based on their coordinates
 * @param moments Array of moments with location metadata
 * @returns Updated moments with distance_from_previous calculated
 */
export function calculateMomentDistances(moments: any[]): any[] {
  return moments.map((moment, index) => {
    if (index === 0 || !moment.metadata?.location?.coordinates) {
      return {
        ...moment,
        metadata: {
          ...moment.metadata,
          location: {
            ...moment.metadata?.location,
            distance_from_previous: 0
          }
        }
      }
    }

    const currentCoords = moment.metadata.location.coordinates
    const previousMoment = moments[index - 1]
    
    if (!previousMoment?.metadata?.location?.coordinates) {
      return moment
    }

    const previousCoords = previousMoment.metadata.location.coordinates
    const distance = calculateDistance(previousCoords, currentCoords)

    return {
      ...moment,
      metadata: {
        ...moment.metadata,
        location: {
          ...moment.metadata.location,
          distance_from_previous: Math.round(distance)
        }
      }
    }
  })
}

/**
 * Format distance for display
 * @param meters Distance in meters
 * @returns Formatted distance string
 */
export function formatDistance(meters: number): string {
  return standardFormatDistance(meters);
}

/**
 * Calculate total journey distance from all moments
 * @param moments Array of moments with location data
 * @returns Total distance in meters
 */
export function calculateTotalJourneyDistance(moments: any[]): number {
  return moments.reduce((total, moment) => {
    return total + (moment.metadata?.location?.distance_from_previous || 0)
  }, 0)
}

/**
 * Get the center point of all coordinates
 * @param coordinates Array of [lng, lat] pairs
 * @returns Center coordinates [lng, lat]
 */
export function getCenterPoint(coordinates: [number, number][]): [number, number] {
  if (coordinates.length === 0) return [0, 0]
  
  const avgLng = coordinates.reduce((sum, [lng]) => sum + lng, 0) / coordinates.length
  const avgLat = coordinates.reduce((sum, [, lat]) => sum + lat, 0) / coordinates.length
  
  return [avgLng, avgLat]
}

/**
 * Check if coordinates are within a reasonable range (basic validation)
 * @param coords Coordinate pair [lng, lat]
 * @returns true if coordinates are valid
 */
export function isValidCoordinate(coords: [number, number]): boolean {
  const [lng, lat] = coords
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
}