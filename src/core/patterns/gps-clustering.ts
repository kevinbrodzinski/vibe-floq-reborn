// GPS-based venue clustering for missing venue intelligence
import { latLngToCell, cellToLatLng, gridDisk } from 'h3-js';
import type { VenueCluster } from './store';
import { storage } from '@/lib/storage';
import { STORAGE_KEYS, EMPTY_GPS_CLUSTERS } from './store';

// H3 precision 9 ≈ 50m hexagons - good balance of privacy and accuracy
const H3_PRECISION = 9;
const MIN_VISIT_COUNT = 3;
const CLUSTER_MERGE_DISTANCE_M = 100;

// Get or create GPS cluster for location
export async function getOrCreateCluster(
  lat: number, 
  lng: number,
  dwellMin: number = 0
): Promise<VenueCluster | null> {
  if (!isValidCoordinate(lat, lng)) return null;

  try {
    const h3Index = latLngToCell(lat, lng, H3_PRECISION);
    const clusters = await readGPSClusters();
    
    let cluster = clusters.data[h3Index];
    
    if (!cluster) {
      // Create new cluster
      const center = cellToLatLng(h3Index);
      cluster = {
        id: h3Index,
        center: { lat: center[0], lng: center[1] },
        radius: 50, // H3 precision 9 approximate radius
        visitCount: 1,
        totalDwellMin: dwellMin,
        confidence: 0.1, // low initial confidence
        lastVisit: Date.now(),
        energyDelta: 0,
        preferredVibes: {}
      };
    } else {
      // Update existing cluster
      cluster.visitCount++;
      cluster.totalDwellMin += dwellMin;
      cluster.lastVisit = Date.now();
      cluster.confidence = Math.min(1, cluster.visitCount / 10); // increase confidence with visits
    }
    
    clusters.data[h3Index] = cluster;
    await writeGPSClusters(clusters);
    
    return cluster;
  } catch (error) {
    console.warn('Failed to get/create GPS cluster:', error);
    return null;
  }
}

// Find nearby clusters within radius
export async function findNearbyClusters(
  lat: number,
  lng: number,
  radiusM: number = 200
): Promise<VenueCluster[]> {
  if (!isValidCoordinate(lat, lng)) return [];

  try {
    const centerH3 = latLngToCell(lat, lng, H3_PRECISION);
    const clusters = await readGPSClusters();
    
    // Get all hexagons within approximate radius
    const searchRadius = Math.ceil(radiusM / 100); // rough conversion to H3 rings
    const nearbyHexes = gridDisk(centerH3, searchRadius);
    
    const nearbyClusters: VenueCluster[] = [];
    
    for (const hex of nearbyHexes) {
      const cluster = clusters.data[hex];
      if (cluster && cluster.visitCount >= MIN_VISIT_COUNT) {
        // Calculate actual distance
        const distance = haversineDistance(lat, lng, cluster.center.lat, cluster.center.lng);
        if (distance <= radiusM) {
          nearbyClusters.push(cluster);
        }
      }
    }
    
    return nearbyClusters.sort((a, b) => b.visitCount - a.visitCount);
  } catch (error) {
    console.warn('Failed to find nearby clusters:', error);
    return [];
  }
}

// Get cluster insights for a location
export function getClusterInsights(cluster: VenueCluster): {
  isFrequentSpot: boolean;
  avgDwellTime: number;
  energyImpact: 'boost' | 'neutral' | 'drain';
  topVibes: Array<{ vibe: string; confidence: number }>;
} {
  const avgDwellTime = cluster.totalDwellMin / cluster.visitCount;
  const isFrequentSpot = cluster.visitCount >= 5 && cluster.confidence > 0.5;
  
  let energyImpact: 'boost' | 'neutral' | 'drain' = 'neutral';
  if (cluster.energyDelta > 0.2) energyImpact = 'boost';
  else if (cluster.energyDelta < -0.2) energyImpact = 'drain';
  
  const topVibes = Object.entries(cluster.preferredVibes)
    .sort(([,a], [,b]) => (b || 0) - (a || 0))
    .slice(0, 3)
    .map(([vibe, weight]) => ({ vibe, confidence: weight || 0 }));
  
  return {
    isFrequentSpot,
    avgDwellTime,
    energyImpact,
    topVibes
  };
}

// Suggest user label for frequently visited cluster
export function suggestClusterLabel(cluster: VenueCluster): string | null {
  if (cluster.userLabel) return cluster.userLabel;
  if (cluster.visitCount < 5) return null;
  
  const insights = getClusterInsights(cluster);
  const { avgDwellTime, energyImpact, topVibes } = insights;
  
  // Suggest based on patterns
  if (avgDwellTime > 60 && topVibes[0]?.vibe === 'focused') {
    return 'Work spot';
  } else if (avgDwellTime < 30 && energyImpact === 'boost') {
    return 'Quick stop';
  } else if (topVibes[0]?.vibe === 'social' && avgDwellTime > 45) {
    return 'Social hangout';
  } else if (topVibes[0]?.vibe === 'chill') {
    return 'Relaxation spot';
  }
  
  return 'Frequent location';
}

// Storage operations
async function readGPSClusters() {
  try {
    const stored = await storage.getItem(STORAGE_KEYS.GPS_CLUSTERS);
    return stored ? JSON.parse(stored) : EMPTY_GPS_CLUSTERS;
  } catch {
    return EMPTY_GPS_CLUSTERS;
  }
}

async function writeGPSClusters(clusters: typeof EMPTY_GPS_CLUSTERS) {
  try {
    clusters.updatedAt = Date.now();
    await storage.setJSON(STORAGE_KEYS.GPS_CLUSTERS, clusters);
  } catch (error) {
    console.warn('Failed to write GPS clusters:', error);
  }
}

// Utility functions
function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Cleanup old clusters (called during maintenance)
export async function cleanupOldClusters(maxAgeMs = 90 * 24 * 60 * 60 * 1000): Promise<void> {
  try {
    const clusters = await readGPSClusters();
    const cutoff = Date.now() - maxAgeMs;
    let cleaned = false;
    
    Object.keys(clusters.data).forEach(clusterId => {
      const cluster = clusters.data[clusterId];
      if (cluster.visitCount < 3 && cluster.lastVisit < cutoff) {
        delete clusters.data[clusterId];
        cleaned = true;
      }
    });
    
    if (cleaned) {
      await writeGPSClusters(clusters);
    }
  } catch (error) {
    console.warn('Failed to cleanup GPS clusters:', error);
  }
}