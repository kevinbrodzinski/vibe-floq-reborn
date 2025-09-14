import { describe, it, expect } from 'vitest';
import { mixHexOklab, vibeToHex, vibeToPixi, gradientStops } from '@/lib/vibe/color';
import { VIBES } from '@/lib/vibes';

describe('Vibe Color System', () => {
  it('OKLab mixing is stable', () => {
    const result = mixHexOklab('#ff0000', '#0000ff', 0.5);
    expect(result).toMatch(/^#([0-9a-f]{6})$/i);
    
    // Test perceptual midpoint is consistent
    const red = '#ff0000';
    const blue = '#0000ff';
    const mid1 = mixHexOklab(red, blue, 0.5);
    const mid2 = mixHexOklab(blue, red, 0.5);
    expect(mid1).toBe(mid2); // Should be commutative
  });

  it('vibeToHex returns valid hex colors', () => {
    VIBES.forEach(vibe => {
      const hex = vibeToHex(vibe);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('vibeToPixi returns valid numeric colors', () => {
    VIBES.forEach(vibe => {
      const pixi = vibeToPixi(vibe);
      expect(pixi).toBeGreaterThanOrEqual(0);
      expect(pixi).toBeLessThanOrEqual(0xffffff);
    });
  });

  it('gradientStops generates valid 4-stop gradient', () => {
    const stops = gradientStops('#ff0000', '#0000ff');
    expect(stops).toHaveLength(4);
    expect(stops[0]).toEqual([0.00, '#ff0000']);
    expect(stops[3]).toEqual([1.00, '#0000ff']);
    
    // Middle stops should be interpolated
    expect(stops[1][0]).toBe(0.35);
    expect(stops[2][0]).toBe(0.65);
  });

  it('PIXI cache improves performance', () => {
    const start = performance.now();
    
    // First calls (cache miss)
    VIBES.forEach(vibe => vibeToPixi(vibe));
    const firstRun = performance.now() - start;
    
    const cacheStart = performance.now();
    
    // Second calls (cache hit)
    VIBES.forEach(vibe => vibeToPixi(vibe));
    const secondRun = performance.now() - cacheStart;
    
    expect(secondRun).toBeLessThan(firstRun);
  });
});