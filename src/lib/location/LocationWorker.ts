/**
 * Location Web Worker - Heavy spatial computations off main thread
 * 
 * Handles:
 * - H3 spatial indexing calculations
 * - Movement context analysis (walking vs driving detection)
 * - Distance calculations for large datasets
 * - Geofence boundary checking
 * - Spatial clustering and analysis
 */

import { latLngToCell, cellToBoundary, gridDisk, cellToLatLng } from 'h3-js';

// Types for worker communication
interface LocationWorkerMessage {
  id: string;
  type: 'h3-index' | 'movement-analysis' | 'distance-batch' | 'geofence-check' | 'spatial-cluster';
  payload: any;
}

interface LocationWorkerResponse {
  id: string;
  type: string;
  result?: any;
  error?: string;
}

interface MovementPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
}

interface GeofenceRegion {
  id: string;
  center: { lat: number; lng: number };
  radius: number;
  type: 'circle' | 'polygon';
  polygon?: Array<{ lat: number; lng: number }>;
}

// Haversine distance calculation
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Calculate bearing between two points
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  return (θ * 180 / Math.PI + 360) % 360; // Bearing in degrees
}

// Movement context analysis
function analyzeMovement(points: MovementPoint[]): {
  speed: number;
  acceleration: number;
  context: 'stationary' | 'walking' | 'cycling' | 'driving' | 'transit';
  confidence: number;
  bearing: number;
  smoothedPath: MovementPoint[];
} {
  if (points.length < 2) {
    return {
      speed: 0,
      acceleration: 0,
      context: 'stationary',
      confidence: 1.0,
      bearing: 0,
      smoothedPath: points
    };
  }

  // Calculate speeds between consecutive points
  const speeds: number[] = [];
  const bearings: number[] = [];
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // seconds
    
    if (timeDiff > 0) {
      const distance = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
      const speed = distance / timeDiff; // m/s
      speeds.push(speed);
      
      const bearing = calculateBearing(prev.lat, prev.lng, curr.lat, curr.lng);
      bearings.push(bearing);
    }
  }

  // Calculate average speed and acceleration
  const avgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
  const acceleration = speeds.length > 1 ? 
    (speeds[speeds.length - 1] - speeds[0]) / speeds.length : 0;

  // Average bearing
  const avgBearing = bearings.reduce((sum, bearing) => sum + bearing, 0) / bearings.length;

  // Determine movement context based on speed patterns
  let context: 'stationary' | 'walking' | 'cycling' | 'driving' | 'transit';
  let confidence = 0.5;

  if (avgSpeed < 0.5) { // < 0.5 m/s
    context = 'stationary';
    confidence = 0.9;
  } else if (avgSpeed < 2.0) { // < 2 m/s (7.2 km/h)
    context = 'walking';
    confidence = 0.8;
  } else if (avgSpeed < 8.0) { // < 8 m/s (28.8 km/h)
    context = 'cycling';
    confidence = 0.7;
  } else if (avgSpeed < 25.0) { // < 25 m/s (90 km/h)
    context = 'driving';
    confidence = 0.8;
  } else {
    context = 'transit'; // High speed, likely train/plane
    confidence = 0.6;
  }

  // Apply smoothing to path using simple moving average
  const smoothedPath = points.map((point, index) => {
    if (index === 0 || index === points.length - 1) {
      return point; // Keep first and last points unchanged
    }

    const windowSize = Math.min(3, points.length);
    const startIdx = Math.max(0, index - Math.floor(windowSize / 2));
    const endIdx = Math.min(points.length, startIdx + windowSize);
    
    let latSum = 0, lngSum = 0, count = 0;
    for (let i = startIdx; i < endIdx; i++) {
      latSum += points[i].lat;
      lngSum += points[i].lng;
      count++;
    }

    return {
      ...point,
      lat: latSum / count,
      lng: lngSum / count
    };
  });

  return {
    speed: avgSpeed,
    acceleration,
    context,
    confidence,
    bearing: avgBearing,
    smoothedPath
  };
}

// H3 spatial indexing operations
function processH3Operations(lat: number, lng: number, resolution: number = 9): {
  h3Index: string;
  neighbors: string[];
  boundary: Array<[number, number]>;
  centerPoint: [number, number];
  area: number;
} {
  const h3Index = latLngToCell(lat, lng, resolution);
  const neighbors = gridDisk(h3Index, 1); // 1-ring neighbors
  const boundary = cellToBoundary(h3Index, true); // GeoJSON format
  const centerPoint = cellToLatLng(h3Index);
  
  // Approximate area calculation (H3 cells have roughly equal area)
  const areas = [
    4250546851.0, // resolution 0
    607220071.0,  // resolution 1
    86745854.0,   // resolution 2
    12392264.0,   // resolution 3
    1770347.0,    // resolution 4
    252903.0,     // resolution 5
    36129.0,      // resolution 6
    5161.0,       // resolution 7
    737.0,        // resolution 8
    105.0,        // resolution 9
    15.0,         // resolution 10
    2.0,          // resolution 11
    0.3,          // resolution 12
    0.04,         // resolution 13
    0.006,        // resolution 14
    0.0009        // resolution 15
  ];
  
  const area = areas[resolution] || 105.0; // Default to resolution 9

  return {
    h3Index,
    neighbors,
    boundary,
    centerPoint,
    area
  };
}

// Batch distance calculations
function calculateDistanceBatch(
  origin: { lat: number; lng: number },
  points: Array<{ lat: number; lng: number; id?: string }>
): Array<{ id?: string; distance: number; bearing: number }> {
  return points.map(point => ({
    id: point.id,
    distance: calculateDistance(origin.lat, origin.lng, point.lat, point.lng),
    bearing: calculateBearing(origin.lat, origin.lng, point.lat, point.lng)
  }));
}

// Geofence checking
function checkGeofences(
  point: { lat: number; lng: number },
  geofences: GeofenceRegion[]
): Array<{ geofenceId: string; isInside: boolean; distance: number }> {
  return geofences.map(geofence => {
    let isInside = false;
    let distance = 0;

    if (geofence.type === 'circle') {
      distance = calculateDistance(
        point.lat, point.lng,
        geofence.center.lat, geofence.center.lng
      );
      isInside = distance <= geofence.radius;
    } else if (geofence.type === 'polygon' && geofence.polygon) {
      // Point-in-polygon algorithm (ray casting)
      const polygon = geofence.polygon;
      let inside = false;
      
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        if (((polygon[i].lat > point.lat) !== (polygon[j].lat > point.lat)) &&
            (point.lng < (polygon[j].lng - polygon[i].lng) * (point.lat - polygon[i].lat) / 
             (polygon[j].lat - polygon[i].lat) + polygon[i].lng)) {
          inside = !inside;
        }
      }
      
      isInside = inside;
      
      // Calculate distance to polygon boundary (simplified - distance to center)
      distance = calculateDistance(
        point.lat, point.lng,
        geofence.center.lat, geofence.center.lng
      );
    }

    return {
      geofenceId: geofence.id,
      isInside,
      distance
    };
  });
}

// Spatial clustering using simple distance-based clustering
function performSpatialClustering(
  points: Array<{ lat: number; lng: number; id?: string }>,
  maxDistance: number = 100 // meters
): Array<{ 
  clusterId: string; 
  center: { lat: number; lng: number }; 
  points: Array<{ lat: number; lng: number; id?: string }>; 
  radius: number 
}> {
  const clusters: Array<{
    clusterId: string;
    center: { lat: number; lng: number };
    points: Array<{ lat: number; lng: number; id?: string }>;
    radius: number;
  }> = [];
  
  const unprocessed = [...points];
  let clusterIndex = 0;

  while (unprocessed.length > 0) {
    const seed = unprocessed.shift()!;
    const cluster = {
      clusterId: `cluster-${clusterIndex++}`,
      center: { lat: seed.lat, lng: seed.lng },
      points: [seed],
      radius: 0
    };

    // Find all points within maxDistance of the seed
    for (let i = unprocessed.length - 1; i >= 0; i--) {
      const point = unprocessed[i];
      const distance = calculateDistance(seed.lat, seed.lng, point.lat, point.lng);
      
      if (distance <= maxDistance) {
        cluster.points.push(point);
        unprocessed.splice(i, 1);
      }
    }

    // Calculate cluster center and radius
    if (cluster.points.length > 1) {
      let latSum = 0, lngSum = 0;
      cluster.points.forEach(p => {
        latSum += p.lat;
        lngSum += p.lng;
      });
      
      cluster.center = {
        lat: latSum / cluster.points.length,
        lng: lngSum / cluster.points.length
      };

      // Calculate radius as max distance from center
      cluster.radius = Math.max(...cluster.points.map(p =>
        calculateDistance(cluster.center.lat, cluster.center.lng, p.lat, p.lng)
      ));
    }

    clusters.push(cluster);
  }

  return clusters;
}

// Worker message handler
self.onmessage = function(e: MessageEvent<LocationWorkerMessage>) {
  const { id, type, payload } = e.data;
  
  try {
    let result: any;

    switch (type) {
      case 'h3-index':
        result = processH3Operations(payload.lat, payload.lng, payload.resolution);
        break;

      case 'movement-analysis':
        result = analyzeMovement(payload.points);
        break;

      case 'distance-batch':
        result = calculateDistanceBatch(payload.origin, payload.points);
        break;

      case 'geofence-check':
        result = checkGeofences(payload.point, payload.geofences);
        break;

      case 'spatial-cluster':
        result = performSpatialClustering(payload.points, payload.maxDistance);
        break;

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }

    const response: LocationWorkerResponse = {
      id,
      type,
      result
    };

    self.postMessage(response);

  } catch (error) {
    const response: LocationWorkerResponse = {
      id,
      type,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    self.postMessage(response);
  }
};