/**
 * Location Processing Web Worker
 * Handles heavy location calculations in background to avoid blocking main thread
 * Implements background processing optimization for location system performance
 */

// Types for worker communication
interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
  speed?: number;
  heading?: number;
}

interface MovementAnalysis {
  averageSpeed: number;
  totalDistance: number;
  isStationary: boolean;
  isWalking: boolean;
  isDriving: boolean;
  dominantHeading?: number;
  stationaryTime: number;
  movingTime: number;
}

interface ProcessLocationRequest {
  type: 'PROCESS_LOCATION_BATCH';
  payload: {
    points: LocationPoint[];
    timeWindow: number; // milliseconds
  };
}

interface GeofenceCheckRequest {
  type: 'CHECK_GEOFENCES';
  payload: {
    currentLocation: LocationPoint;
    geofences: Array<{
      id: string;
      lat: number;
      lng: number;
      radius: number;
    }>;
  };
}

interface DistanceMatrixRequest {
  type: 'CALCULATE_DISTANCE_MATRIX';
  payload: {
    origin: LocationPoint;
    destinations: LocationPoint[];
  };
}

type WorkerRequest = ProcessLocationRequest | GeofenceCheckRequest | DistanceMatrixRequest;

// Haversine distance calculation (optimized for worker)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Calculate bearing between two points
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

// Process location batch for movement analysis
function processLocationBatch(points: LocationPoint[], timeWindow: number): MovementAnalysis {
  if (points.length < 2) {
    return {
      averageSpeed: 0,
      totalDistance: 0,
      isStationary: true,
      isWalking: false,
      isDriving: false,
      stationaryTime: timeWindow,
      movingTime: 0
    };
  }

  // Sort points by timestamp
  const sortedPoints = points.sort((a, b) => a.timestamp - b.timestamp);
  
  let totalDistance = 0;
  let totalTime = 0;
  let movingTime = 0;
  let stationaryTime = 0;
  const speeds: number[] = [];
  const bearings: number[] = [];
  
  // Calculate distances, speeds, and bearings
  for (let i = 1; i < sortedPoints.length; i++) {
    const prev = sortedPoints[i - 1];
    const curr = sortedPoints[i];
    
    const distance = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // seconds
    
    if (timeDiff > 0) {
      const speed = distance / timeDiff; // m/s
      speeds.push(speed);
      
      totalDistance += distance;
      totalTime += timeDiff;
      
      // Classify movement
      if (speed > 0.5) { // Moving
        movingTime += timeDiff;
        
        // Calculate bearing for moving segments
        const bearing = calculateBearing(prev.lat, prev.lng, curr.lat, curr.lng);
        bearings.push(bearing);
      } else { // Stationary
        stationaryTime += timeDiff;
      }
    }
  }
  
  const averageSpeed = totalTime > 0 ? totalDistance / totalTime : 0;
  
  // Determine movement type
  const isStationary = averageSpeed < 0.5; // < 0.5 m/s
  const isWalking = averageSpeed >= 0.5 && averageSpeed < 2.5; // 0.5-2.5 m/s
  const isDriving = averageSpeed >= 2.5; // > 2.5 m/s
  
  // Calculate dominant heading (circular mean)
  let dominantHeading: number | undefined;
  if (bearings.length > 0) {
    const sinSum = bearings.reduce((sum, bearing) => sum + Math.sin(bearing * Math.PI / 180), 0);
    const cosSum = bearings.reduce((sum, bearing) => sum + Math.cos(bearing * Math.PI / 180), 0);
    dominantHeading = (Math.atan2(sinSum, cosSum) * 180 / Math.PI + 360) % 360;
  }
  
  return {
    averageSpeed,
    totalDistance,
    isStationary,
    isWalking,
    isDriving,
    dominantHeading,
    stationaryTime,
    movingTime
  };
}

// Check geofences for current location
function checkGeofences(
  currentLocation: LocationPoint,
  geofences: Array<{ id: string; lat: number; lng: number; radius: number }>
) {
  const results = geofences.map(fence => {
    const distance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      fence.lat,
      fence.lng
    );
    
    return {
      fenceId: fence.id,
      distance,
      isInside: distance <= fence.radius,
      distanceFromEdge: fence.radius - distance
    };
  });
  
  return results;
}

// Calculate distance matrix
function calculateDistanceMatrix(
  origin: LocationPoint,
  destinations: LocationPoint[]
) {
  return destinations.map((dest, index) => ({
    index,
    distance: calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng),
    destination: dest
  }));
}

// Worker message handler
self.onmessage = function(e: MessageEvent<WorkerRequest>) {
  const { type, payload } = e.data;
  
  try {
    switch (type) {
      case 'PROCESS_LOCATION_BATCH': {
        const analysis = processLocationBatch(payload.points, payload.timeWindow);
        self.postMessage({
          type: 'LOCATION_ANALYSIS_RESULT',
          payload: analysis
        });
        break;
      }
      
      case 'CHECK_GEOFENCES': {
        const results = checkGeofences(payload.currentLocation, payload.geofences);
        self.postMessage({
          type: 'GEOFENCE_CHECK_RESULT',
          payload: results
        });
        break;
      }
      
      case 'CALCULATE_DISTANCE_MATRIX': {
        const matrix = calculateDistanceMatrix(payload.origin, payload.destinations);
        self.postMessage({
          type: 'DISTANCE_MATRIX_RESULT',
          payload: matrix
        });
        break;
      }
      
      default:
        console.warn('[LocationWorker] Unknown message type:', type);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error',
        originalType: type
      }
    });
  }
};

// Export types for main thread
export type {
  LocationPoint,
  MovementAnalysis,
  ProcessLocationRequest,
  GeofenceCheckRequest,
  DistanceMatrixRequest,
  WorkerRequest
};