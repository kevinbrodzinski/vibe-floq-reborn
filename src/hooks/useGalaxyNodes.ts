import { useMemo } from 'react';
import type { Vibe } from '@/types';

export interface GalaxyNode {
  id: string;
  kind: 'person' | 'venue' | 'floq';
  x: number;            // canvas-space px
  y: number;
  vibe: Vibe;
  weight: number;       // 0-1 → glow radius / alpha
  isSelf?: boolean;
}

const mockVibes: Vibe[] = [
  'chill', 'social', 'hype', 'romantic', 'solo', 'weird'
];

// Seeded random for stable positioning
function seededRandom(seed: number) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate positions with minimum distance constraints
function generateSpacedPositions(count: number, width: number, height: number, minDistance: number, seed: number): Array<{x: number, y: number}> {
  const positions: Array<{x: number, y: number}> = [];
  const maxAttempts = 100;
  
  // Account for header/footer UI space - use inner 70% of canvas
  const margin = 0.15;
  const usableWidth = width * (1 - 2 * margin);
  const usableHeight = height * (1 - 2 * margin);
  const offsetX = width * margin;
  const offsetY = height * margin;
  
  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let validPosition = false;
    
    while (!validPosition && attempts < maxAttempts) {
      const x = offsetX + seededRandom(seed + i * 100 + attempts) * usableWidth;
      const y = offsetY + seededRandom(seed + i * 100 + attempts + 50) * usableHeight;
      
      // Check minimum distance from existing positions
      validPosition = positions.every(pos => {
        const dx = x - pos.x;
        const dy = y - pos.y;
        return Math.sqrt(dx * dx + dy * dy) >= minDistance;
      });
      
      if (validPosition) {
        positions.push({ x, y });
      }
      attempts++;
    }
    
    // Fallback if we can't find a valid position
    if (!validPosition) {
      positions.push({
        x: offsetX + seededRandom(seed + i * 200) * usableWidth,
        y: offsetY + seededRandom(seed + i * 200 + 25) * usableHeight
      });
    }
  }
  
  return positions;
}

export function useGalaxyNodes(width = 0, height = 0): GalaxyNode[] {
  // Generate 12 well-spaced nodes for clean visual hierarchy
  return useMemo(() => {
    if (!width || !height) return [];
    
    const nodeCount = 12;
    const minDistance = Math.min(width, height) * 0.15; // 15% of smaller dimension
    const seed = 42; // Fixed seed for consistent layout
    const positions = generateSpacedPositions(nodeCount, width, height, minDistance, seed);
    
    return Array.from({ length: nodeCount }, (_, i) => {
      const nodeType = i % 6 === 0 ? 'venue' : i % 8 === 0 ? 'floq' : 'person';
      
      // Different weight ranges for visual hierarchy
      let weight: number;
      if (nodeType === 'venue') {
        weight = 0.7 + seededRandom(seed + i * 300) * 0.3; // 0.7-1.0 for venues
      } else if (nodeType === 'floq') {
        weight = 0.5 + seededRandom(seed + i * 300) * 0.4; // 0.5-0.9 for floqs  
      } else {
        weight = 0.2 + seededRandom(seed + i * 300) * 0.6; // 0.2-0.8 for people
      }
      
      return {
        id: `node-${i}`,
        kind: nodeType,
        x: positions[i].x,
        y: positions[i].y,
        vibe: mockVibes[Math.floor(seededRandom(seed + i * 400) * mockVibes.length)],
        weight,
        isSelf: i === 0 // Mark first node as self for testing
      };
    });
  }, [width, height]);
}