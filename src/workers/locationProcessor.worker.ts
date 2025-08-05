/**
 * Location Processing Web Worker
 * Handles heavy location calculations in background to avoid blocking main thread
 * Implements background processing optimization for location system performance
 */

interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
}

interface MovementAnalysis {
  speed: number; // mph
  bearing: number; // degrees
  acceleration: number; // mph/s
  state: 'stationary' | 'walking' | 'driving';
  confidence: number;
}

interface WorkerRequest {
  type: 'PROCESS_MOVEMENT' | 'CHECK_GEOFENCES' | 'CALCULATE_DISTANCE_MATRIX';
  data: any;
  id: string;
}

interface WorkerResponse {
  type: string;
  data: any;
  id: string;
  error?: string;
}

// Haversine distance calculation
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculate bearing between two points
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

// Process location batch for movement analysis
function processLocationBatch(points: LocationPoint[], timeWindow: number): MovementAnalysis {
  if (points.length < 2) {
    return {
      speed: 0,
      bearing: 0,
      acceleration: 0,
      state: 'stationary',
      confidence: 0.5
    };
  }

  // Filter points within time window
  const now = Date.now();
  const validPoints = points.filter(p => (now - p.timestamp) <= timeWindow);
  
  if (validPoints.length < 2) {
    return {
      speed: 0,
      bearing: 0,
      acceleration: 0,
      state: 'stationary',
      confidence: 0.5
    };
  }

  // Sort by timestamp
  validPoints.sort((a, b) => a.timestamp - b.timestamp);

  // Calculate distances and speeds
  const speeds: number[] = [];
  const bearings: number[] = [];
  
  for (let i = 1; i < validPoints.length; i++) {
    const prev = validPoints[i - 1];
    const curr = validPoints[i];
    
    const distance = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // seconds
    
    if (timeDiff > 0) {
      const speedMs = distance / timeDiff;
      const speedMph = speedMs * 2.237;
      speeds.push(speedMph);
      
      const bearing = calculateBearing(prev.lat, prev.lng, curr.lat, curr.lng);
      bearings.push(bearing);
    }
  }

  if (speeds.length === 0) {
    return {
      speed: 0,
      bearing: 0,
      acceleration: 0,
      state: 'stationary',
      confidence: 0.5
    };
  }

  // Calculate average speed
  const avgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
  
  // Calculate average bearing (circular mean)
  const sinSum = bearings.reduce((sum, bearing) => sum + Math.sin(bearing * Math.PI / 180), 0);
  const cosSum = bearings.reduce((sum, bearing) => sum + Math.cos(bearing * Math.PI / 180), 0);
  const avgBearing = Math.atan2(sinSum / bearings.length, cosSum / bearings.length) * 180 / Math.PI;
  const normalizedBearing = (avgBearing + 360) % 360;

  // Calculate acceleration
  let acceleration = 0;
  if (speeds.length > 1) {
    const speedDiffs = [];
    for (let i = 1; i < speeds.length; i++) {
      speedDiffs.push(speeds[i] - speeds[i - 1]);
    }
    acceleration = speedDiffs.reduce((sum, diff) => sum + diff, 0) / speedDiffs.length;
  }

  // Determine movement state
  let state: 'stationary' | 'walking' | 'driving';
  let confidence: number;

  if (avgSpeed < 2) {
    state = 'stationary';
    confidence = 0.9;
  } else if (avgSpeed < 8) {
    state = 'walking';
    confidence = 0.8;
  } else {
    state = 'driving';
    confidence = 0.9;
  }

  // Adjust confidence based on consistency
  const speedVariance = speeds.reduce((sum, speed) => sum + Math.pow(speed - avgSpeed, 2), 0) / speeds.length;
  const consistencyFactor = Math.max(0, 1 - (speedVariance / (avgSpeed + 1)));
  confidence *= consistencyFactor;

  return {
    speed: avgSpeed,
    bearing: normalizedBearing,
    acceleration,
    state,
    confidence
  };
}

// Check geofences for current location
function checkGeofences(
  currentLocation: LocationPoint,
  geofences: Array<{ id: string; lat: number; lng: number; radius: number }>
) {
  const results = [];

  for (const geofence of geofences) {
    const distance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      geofence.lat,
      geofence.lng
    );

    const isInside = distance <= geofence.radius;
    
    results.push({
      id: geofence.id,
      distance,
      isInside,
      confidence: Math.max(0, 1 - (distance / geofence.radius))
    });
  }

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
    bearing: calculateBearing(origin.lat, origin.lng, dest.lat, dest.lng)
  }));
}

// Worker message handler
self.onmessage = function(e: MessageEvent<WorkerRequest>) {
  const { type, data, id } = e.data;
  
  try {
    let result: any;

    switch (type) {
      case 'PROCESS_MOVEMENT':
        result = processLocationBatch(data.points, data.timeWindow || 300000); // 5 minutes default
        break;

      case 'CHECK_GEOFENCES':
        result = checkGeofences(data.location, data.geofences);
        break;

      case 'CALCULATE_DISTANCE_MATRIX':
        result = calculateDistanceMatrix(data.origin, data.destinations);
        break;

      default:
        throw new Error(`Unknown worker request type: ${type}`);
    }

    const response: WorkerResponse = {
      type,
      data: result,
      id
    };

    self.postMessage(response);

  } catch (error) {
    const response: WorkerResponse = {
      type,
      data: null,
      id,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    self.postMessage(response);
  }
};