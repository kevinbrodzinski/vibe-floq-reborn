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

export function useGalaxyNodes(width = 0, height = 0): GalaxyNode[] {
  // Generate 20 mock nodes for testing - will be replaced with real presence data
  return useMemo(() => {
    if (!width || !height) return [];
    
    return Array.from({ length: 20 }, (_, i) => ({
      id: `fake-${i}`,
      kind: i % 5 === 0 ? 'venue' : i % 7 === 0 ? 'floq' : 'person',
      x: Math.random() * width,
      y: Math.random() * height,
      vibe: mockVibes[i % mockVibes.length],
      weight: Math.random() * 0.6 + 0.4,
      isSelf: i === 0 // Mark first node as self for testing
    }));
  }, [width, height]);
}