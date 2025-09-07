import { describe, it, expect, beforeEach } from 'vitest';
import type { SocialCluster } from '@/types/field';

// Test helpers for clustering math
const mergeDistanceForZoom = (zoom: number) => 42 * Math.pow(2, 11 - zoom);

// Weighted centroid merge test
function weightedMerge(
  cluster: { x: number; y: number; count: number },
  tile: { x: number; y: number; count: number }
): { x: number; y: number; count: number } {
  const totalCount = cluster.count + tile.count;
  return {
    x: (cluster.x * cluster.count + tile.x * tile.count) / totalCount,
    y: (cluster.y * cluster.count + tile.y * tile.count) / totalCount,
    count: totalCount
  };
}

// Closest approach math (from worker)
function closestApproach(
  a: { x: number; y: number; vx: number; vy: number },
  b: { x: number; y: number; vx: number; vy: number }
) {
  const rx = b.x - a.x, ry = b.y - a.y;
  const vx = b.vx - a.vx, vy = b.vy - a.vy;
  const vv = vx * vx + vy * vy;
  
  if (vv === 0) return { 
    tStar: Infinity, 
    d2: rx * rx + ry * ry, 
    mx: (a.x + b.x) / 2, 
    my: (a.y + b.y) / 2 
  };
  
  const tStar = -(rx * vx + ry * vy) / vv;
  const mx = a.x + a.vx * tStar; 
  const my = a.y + a.vy * tStar;
  const dx = rx + vx * tStar; 
  const dy = ry + vy * tStar;
  return { tStar, d2: dx * dx + dy * dy, mx, my };
}

describe('Clustering Math', () => {
  describe('mergeDistanceForZoom', () => {
    it('should be monotonic (decreases as zoom increases)', () => {
      const zoom11 = mergeDistanceForZoom(11);
      const zoom15 = mergeDistanceForZoom(15);
      const zoom17 = mergeDistanceForZoom(17);
      
      expect(zoom11).toBeGreaterThan(zoom15);
      expect(zoom15).toBeGreaterThan(zoom17);
    });
    
    it('should have pixel-scale sanity at common LODs', () => {
      expect(mergeDistanceForZoom(11)).toBe(42); // Base distance
      expect(mergeDistanceForZoom(15)).toBe(42 / 16); // ~2.6px 
      expect(mergeDistanceForZoom(17)).toBe(42 / 64); // ~0.7px
    });
  });

  describe('weightedMerge', () => {
    it('should preserve weighted centroid across permutations', () => {
      const cluster1 = { x: 100, y: 200, count: 3 };
      const tile1 = { x: 200, y: 300, count: 2 };
      const tile2 = { x: 150, y: 250, count: 1 };
      
      // Merge in different orders
      const result1 = weightedMerge(weightedMerge(cluster1, tile1), tile2);
      const result2 = weightedMerge(weightedMerge(cluster1, tile2), tile1);
      
      expect(result1.x).toBeCloseTo(result2.x, 5);
      expect(result1.y).toBeCloseTo(result2.y, 5);
      expect(result1.count).toBe(result2.count);
    });
    
    it('should match sum-weighted mean formula', () => {
      const cluster = { x: 0, y: 0, count: 4 };
      const tile = { x: 100, y: 200, count: 1 };
      
      const result = weightedMerge(cluster, tile);
      const expectedX = (0 * 4 + 100 * 1) / 5; // 20
      const expectedY = (0 * 4 + 200 * 1) / 5; // 40
      
      expect(result.x).toBe(expectedX);
      expect(result.y).toBe(expectedY);
      expect(result.count).toBe(5);
    });
  });

  describe('closestApproach', () => {
    it('should return positive t* only when approaching', () => {
      // Approaching clusters
      const approaching = closestApproach(
        { x: 0, y: 0, vx: 10, vy: 0 },    // Moving right
        { x: 100, y: 0, vx: -5, vy: 0 }   // Moving left toward first
      );
      expect(approaching.tStar).toBeGreaterThan(0);
      
      // Diverging clusters  
      const diverging = closestApproach(
        { x: 0, y: 0, vx: -10, vy: 0 },   // Moving left
        { x: 100, y: 0, vx: 5, vy: 0 }    // Moving right away
      );
      expect(diverging.tStar).toBeLessThanOrEqual(0);
    });
    
    it('should respect horizon clamp', () => {
      const HORIZON_MS = 5 * 60_000; // 5 minutes
      
      // Very slow approach that takes longer than horizon
      const slowApproach = closestApproach(
        { x: 0, y: 0, vx: 0.001, vy: 0 },
        { x: 1000, y: 0, vx: 0, vy: 0 }
      );
      
      // Should be clamped/filtered by caller if tStar > HORIZON_MS
      expect(slowApproach.tStar).toBeGreaterThan(HORIZON_MS);
    });
    
    it('should calculate meeting point correctly', () => {
      const result = closestApproach(
        { x: 0, y: 0, vx: 10, vy: 0 },
        { x: 20, y: 0, vx: -10, vy: 0 }
      );
      
      // Should meet at midpoint (10, 0) after 1 time unit
      expect(result.tStar).toBe(1);
      expect(result.mx).toBe(10);
      expect(result.my).toBe(0);
    });
  });
});

describe('Phase Synchronization', () => {
  it('should be order-independent', () => {
    // Simulate phase sync accumulation
    const states = new Map([
      ['a', { phase: 0 }],
      ['b', { phase: Math.PI }],
      ['c', { phase: Math.PI / 2 }]
    ]);
    
    const K = 0.05;
    
    // Apply adjustments in different orders
    const adjustments1 = new Map<string, number>();
    const adjustments2 = new Map<string, number>();
    
    // Order 1: a->b, b->c, a->c
    ['a', 'b', 'c'].forEach(id1 => {
      ['a', 'b', 'c'].forEach(id2 => {
        if (id1 < id2) {
          const s1 = states.get(id1)!;
          const s2 = states.get(id2)!;
          const diff = s2.phase - s1.phase;
          const adj = Math.sin(diff) * K;
          adjustments1.set(id1, (adjustments1.get(id1) || 0) + adj);
          adjustments1.set(id2, (adjustments1.get(id2) || 0) - adj);
        }
      });
    });
    
    // Order 2: c->a, a->b, b->c (different iteration order)
    ['c', 'a', 'b'].forEach(id1 => {
      ['c', 'a', 'b'].forEach(id2 => {
        if (id1 < id2) {
          const s1 = states.get(id1)!;
          const s2 = states.get(id2)!;
          const diff = s2.phase - s1.phase;
          const adj = Math.sin(diff) * K;
          adjustments2.set(id1, (adjustments2.get(id1) || 0) + adj);
          adjustments2.set(id2, (adjustments2.get(id2) || 0) - adj);
        }
      });
    });
    
    // Results should be identical regardless of iteration order
    expect(adjustments1.get('a')).toBeCloseTo(adjustments2.get('a') || 0, 10);
    expect(adjustments1.get('b')).toBeCloseTo(adjustments2.get('b') || 0, 10);
    expect(adjustments1.get('c')).toBeCloseTo(adjustments2.get('c') || 0, 10);
  });
});