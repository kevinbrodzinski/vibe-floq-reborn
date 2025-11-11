import type { Cluster } from '@/hooks/useClusters';
import ngeohash from 'ngeohash';

/**
 * Mock person interface matching AnimationDemoPage
 */
interface MockPerson {
  id: string;
  lat: number;
  lng: number;
  vibe?: string;
  patternPhase: number;
}

/**
 * Generate mock clusters from mock people positions for animation demo
 * Groups people by geohash and creates cluster aggregates
 */
export function generateMockClusters(
  people: MockPerson[],
  precision: number = 6
): Cluster[] {
  if (!people.length) return [];

  // Group people by geohash at specified precision
  const geohashGroups = new Map<string, MockPerson[]>();
  
  for (const person of people) {
    const gh = ngeohash.encode(person.lat, person.lng, precision);
    if (!geohashGroups.has(gh)) {
      geohashGroups.set(gh, []);
    }
    geohashGroups.get(gh)!.push(person);
  }

  // Convert groups to cluster format
  const clusters: Cluster[] = [];
  
  for (const [gh6, group] of geohashGroups.entries()) {
    // Calculate centroid
    const avgLat = group.reduce((sum, p) => sum + p.lat, 0) / group.length;
    const avgLng = group.reduce((sum, p) => sum + p.lng, 0) / group.length;
    
    // Count vibes
    const vibeCounts: Record<string, number> = {};
    for (const person of group) {
      const personVibe = person.vibe || 'chill';
      vibeCounts[personVibe] = (vibeCounts[personVibe] || 0) + 1;
    }
    
    // Find mode vibe (most common)
    let vibeMode = 'chill';
    let maxCount = 0;
    for (const [vibe, count] of Object.entries(vibeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        vibeMode = vibe;
      }
    }
    
    clusters.push({
      gh6,
      centroid: {
        type: 'Point',
        coordinates: [avgLng, avgLat]
      },
      total: group.length,
      vibe_counts: vibeCounts,
      vibe_mode: vibeMode,
      member_count: group.length
    });
  }
  
  return clusters;
}

/**
 * Inject mock clusters into global window for useClusters hook override
 */
export function injectMockClusters(clusters: Cluster[]): void {
  if (typeof window !== 'undefined') {
    (window as any).__mockClusters = clusters;
  }
}

/**
 * Clear mock clusters from global window
 */
export function clearMockClusters(): void {
  if (typeof window !== 'undefined') {
    delete (window as any).__mockClusters;
  }
}
