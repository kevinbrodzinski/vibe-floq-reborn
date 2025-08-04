/**
 * Geofencing Privacy Zones Service
 * Handles user-defined privacy zones with automatic location accuracy degradation
 */

import { GPSCoords } from './standardGeo';

export interface CircularGeofence {
  id: string;
  name: string;
  type: 'circular';
  center: GPSCoords;
  radius: number; // meters
  privacyLevel: 'hide' | 'street' | 'area';
  isActive: boolean;
  createdAt: string;
}

export interface PolygonGeofence {
  id: string;
  name: string;
  type: 'polygon';
  vertices: GPSCoords[];
  privacyLevel: 'hide' | 'street' | 'area';
  isActive: boolean;
  createdAt: string;
}

export type Geofence = CircularGeofence | PolygonGeofence;

export interface GeofenceMatch {
  geofence: Geofence;
  distance: number; // distance to boundary (negative if inside)
  confidence: number; // 0-1 confidence score
}

/**
 * Check if a point is inside a circular geofence
 */
function isInsideCircularGeofence(point: GPSCoords, geofence: CircularGeofence): boolean {
  const R = 6371000; // Earth's radius in meters
  
  const φ1 = (point.lat * Math.PI) / 180;
  const φ2 = (geofence.center.lat * Math.PI) / 180;
  const Δφ = ((geofence.center.lat - point.lat) * Math.PI) / 180;
  const Δλ = ((geofence.center.lng - point.lng) * Math.PI) / 180;

  const a = 
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return distance <= geofence.radius;
}

/**
 * Check if a point is inside a polygon geofence using ray casting algorithm
 */
function isInsidePolygonGeofence(point: GPSCoords, geofence: PolygonGeofence): boolean {
  const { vertices } = geofence;
  let inside = false;
  
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].lng;
    const yi = vertices[i].lat;
    const xj = vertices[j].lng;
    const yj = vertices[j].lat;
    
    if (((yi > point.lat) !== (yj > point.lat)) &&
        (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

/**
 * Calculate distance from point to circular geofence boundary
 */
function distanceToCircularBoundary(point: GPSCoords, geofence: CircularGeofence): number {
  const R = 6371000; // Earth's radius in meters
  
  const φ1 = (point.lat * Math.PI) / 180;
  const φ2 = (geofence.center.lat * Math.PI) / 180;
  const Δφ = ((geofence.center.lat - point.lat) * Math.PI) / 180;
  const Δλ = ((geofence.center.lng - point.lng) * Math.PI) / 180;

  const a = 
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    
  const distanceToCenter = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return distanceToCenter - geofence.radius; // negative if inside
}

/**
 * Calculate minimum distance from point to polygon boundary
 */
function distanceToPolygonBoundary(point: GPSCoords, geofence: PolygonGeofence): number {
  const { vertices } = geofence;
  let minDistance = Infinity;
  const inside = isInsidePolygonGeofence(point, geofence);
  
  // Calculate distance to each edge
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    const distance = distanceToLineSegment(point, vertices[i], vertices[j]);
    minDistance = Math.min(minDistance, distance);
  }
  
  return inside ? -minDistance : minDistance;
}

/**
 * Calculate distance from point to line segment
 */
function distanceToLineSegment(point: GPSCoords, start: GPSCoords, end: GPSCoords): number {
  const R = 6371000; // Earth's radius in meters
  
  // Convert to radians
  const pointRad = { lat: point.lat * Math.PI / 180, lng: point.lng * Math.PI / 180 };
  const startRad = { lat: start.lat * Math.PI / 180, lng: start.lng * Math.PI / 180 };
  const endRad = { lat: end.lat * Math.PI / 180, lng: end.lng * Math.PI / 180 };
  
  // Simplified distance calculation for small distances
  const dx = (end.lng - start.lng) * Math.cos(start.lat * Math.PI / 180);
  const dy = end.lat - start.lat;
  const px = (point.lng - start.lng) * Math.cos(start.lat * Math.PI / 180);
  const py = point.lat - start.lat;
  
  const segmentLength = Math.sqrt(dx * dx + dy * dy);
  if (segmentLength === 0) {
    // Start and end are the same point
    const distance = Math.sqrt(px * px + py * py);
    return distance * R * Math.PI / 180;
  }
  
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (segmentLength * segmentLength)));
  const closestX = start.lng + t * (end.lng - start.lng);
  const closestY = start.lat + t * (end.lat - start.lat);
  
  const distanceX = (point.lng - closestX) * Math.cos(point.lat * Math.PI / 180);
  const distanceY = point.lat - closestY;
  const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
  
  return distance * R * Math.PI / 180;
}

/**
 * Geofencing service class
 */
export class GeofencingService {
  private geofences: Geofence[] = [];
  private readonly CONFIDENCE_BUFFER = 50; // meters for confidence calculation

  /**
   * Add a new geofence
   */
  addGeofence(geofence: Geofence): void {
    const existingIndex = this.geofences.findIndex(g => g.id === geofence.id);
    if (existingIndex >= 0) {
      this.geofences[existingIndex] = geofence;
    } else {
      this.geofences.push(geofence);
    }
  }

  /**
   * Remove a geofence
   */
  removeGeofence(id: string): void {
    this.geofences = this.geofences.filter(g => g.id !== id);
  }

  /**
   * Get all geofences
   */
  getGeofences(): Geofence[] {
    return [...this.geofences];
  }

  /**
   * Get active geofences
   */
  getActiveGeofences(): Geofence[] {
    return this.geofences.filter(g => g.isActive);
  }

  /**
   * Check which geofences contain or are near a point
   */
  checkGeofences(point: GPSCoords, accuracy: number = 10): GeofenceMatch[] {
    const matches: GeofenceMatch[] = [];
    
    for (const geofence of this.getActiveGeofences()) {
      let distance: number;
      let inside: boolean;
      
      if (geofence.type === 'circular') {
        distance = distanceToCircularBoundary(point, geofence);
        inside = distance <= 0;
      } else {
        distance = distanceToPolygonBoundary(point, geofence);
        inside = distance <= 0;
      }
      
      // Check if point is inside or close enough to matter (considering GPS accuracy)
      if (inside || Math.abs(distance) <= accuracy + this.CONFIDENCE_BUFFER) {
        const confidence = this.calculateConfidence(distance, accuracy);
        matches.push({
          geofence,
          distance,
          confidence
        });
      }
    }
    
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate confidence score based on distance and GPS accuracy
   */
  private calculateConfidence(distance: number, accuracy: number): number {
    if (distance <= -accuracy) {
      // Definitely inside
      return 1.0;
    } else if (distance >= accuracy + this.CONFIDENCE_BUFFER) {
      // Definitely outside
      return 0.0;
    } else {
      // In the uncertainty zone
      const totalRange = accuracy + this.CONFIDENCE_BUFFER + accuracy;
      const position = distance + accuracy;
      return Math.max(0, 1 - (position / totalRange));
    }
  }

  /**
   * Apply privacy filtering based on geofence matches
   */
  applyPrivacyFiltering(
    point: GPSCoords, 
    accuracy: number,
    matches: GeofenceMatch[]
  ): { lat: number; lng: number; accuracy: number; hidden: boolean } {
    if (matches.length === 0) {
      return { ...point, accuracy, hidden: false };
    }

    // Find the most restrictive privacy level with high confidence
    const highConfidenceMatches = matches.filter(m => m.confidence > 0.7);
    if (highConfidenceMatches.length === 0) {
      return { ...point, accuracy, hidden: false };
    }

    const mostRestrictive = highConfidenceMatches.reduce((prev, current) => {
      const prevLevel = this.getPrivacyLevelValue(prev.geofence.privacyLevel);
      const currentLevel = this.getPrivacyLevelValue(current.geofence.privacyLevel);
      return currentLevel > prevLevel ? current : prev;
    });

    switch (mostRestrictive.geofence.privacyLevel) {
      case 'hide':
        return { lat: 0, lng: 0, accuracy: 0, hidden: true };
      case 'area':
        return this.degradeToArea(point, accuracy);
      case 'street':
        return this.degradeToStreet(point, accuracy);
      default:
        return { ...point, accuracy, hidden: false };
    }
  }

  /**
   * Get numeric value for privacy level comparison
   */
  private getPrivacyLevelValue(level: string): number {
    switch (level) {
      case 'hide': return 3;
      case 'area': return 2;
      case 'street': return 1;
      default: return 0;
    }
  }

  /**
   * Degrade location to street level (100m grid)
   */
  private degradeToStreet(point: GPSCoords, originalAccuracy: number): { lat: number; lng: number; accuracy: number; hidden: boolean } {
    const gridSize = 100; // 100m grid
    const deltaLat = gridSize / 111320;
    const deltaLng = gridSize / (111320 * Math.cos(point.lat * Math.PI / 180));

    const snappedLat = Math.round(point.lat / deltaLat) * deltaLat;
    const snappedLng = Math.round(point.lng / deltaLng) * deltaLng;

    return {
      lat: snappedLat,
      lng: snappedLng,
      accuracy: Math.max(originalAccuracy, 100),
      hidden: false
    };
  }

  /**
   * Degrade location to area level (1km grid)
   */
  private degradeToArea(point: GPSCoords, originalAccuracy: number): { lat: number; lng: number; accuracy: number; hidden: boolean } {
    const gridSize = 1000; // 1km grid
    const deltaLat = gridSize / 111320;
    const deltaLng = gridSize / (111320 * Math.cos(point.lat * Math.PI / 180));

    const snappedLat = Math.round(point.lat / deltaLat) * deltaLat;
    const snappedLng = Math.round(point.lng / deltaLng) * deltaLng;

    return {
      lat: snappedLat,
      lng: snappedLng,
      accuracy: Math.max(originalAccuracy, 1000),
      hidden: false
    };
  }

  /**
   * Create a circular geofence from center point and radius
   */
  static createCircularGeofence(
    id: string,
    name: string,
    center: GPSCoords,
    radius: number,
    privacyLevel: 'hide' | 'street' | 'area' = 'street'
  ): CircularGeofence {
    return {
      id,
      name,
      type: 'circular',
      center,
      radius,
      privacyLevel,
      isActive: true,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Create a polygon geofence from vertices
   */
  static createPolygonGeofence(
    id: string,
    name: string,
    vertices: GPSCoords[],
    privacyLevel: 'hide' | 'street' | 'area' = 'street'
  ): PolygonGeofence {
    return {
      id,
      name,
      type: 'polygon',
      vertices,
      privacyLevel,
      isActive: true,
      createdAt: new Date().toISOString()
    };
  }
}

// Singleton instance
export const geofencingService = new GeofencingService();