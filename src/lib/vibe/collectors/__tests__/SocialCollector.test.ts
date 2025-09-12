import { describe, it, expect, vi } from 'vitest';
import { SocialCollector } from '../SocialCollector';

// Mock computeCohesion function
vi.mock('@/lib/flow/hudSignals', () => ({
  computeCohesion: vi.fn(() => ({ cohesion: 0.5, nearby: 2 }))
}));

describe('SocialCollector', () => {
  it('collects social signal and computes quality', async () => {
    const mockProvider = {
      getFriendHeads: vi.fn(() => [
        { lng: -118.49, lat: 34.0, t_head: new Date().toISOString() },
        { lng: -118.50, lat: 34.01, t_head: new Date().toISOString() }
      ]),
      getMyRecentPath: vi.fn(() => [
        { lng: -118.49, lat: 34.0, t: Date.now() - 60_000 }
      ]),
      getConvergenceProb: vi.fn(() => 0.7),
    };

    const collector = new SocialCollector(mockProvider);
    
    expect(collector.isAvailable()).toBe(true);
    
    const signal = await collector.collect();
    expect(signal).toBeTruthy();
    expect(signal?.nearbyFriends).toBe(2);
    expect(signal?.cohesion01).toBe(0.5);
    expect(signal?.convergenceProb01).toBe(0.7);
    expect(signal?.sampleCount).toBe(2);
    
    const quality = collector.getQuality();
    expect(quality).toBeGreaterThan(0.3);
    expect(quality).toBeLessThanOrEqual(1);
  });

  it('handles empty friend data gracefully', async () => {
    const mockProvider = {
      getFriendHeads: vi.fn(() => []),
      getMyRecentPath: vi.fn(() => []),
      getConvergenceProb: vi.fn(() => undefined),
    };

    const collector = new SocialCollector(mockProvider);
    const signal = await collector.collect();
    
    expect(signal).toBeTruthy();
    expect(signal?.nearbyFriends).toBe(2); // mocked value
    expect(signal?.sampleCount).toBe(0);
    expect(signal?.convergenceProb01).toBeUndefined();
  });

  it('respects 10s collection cadence', async () => {
    const mockProvider = {
      getFriendHeads: vi.fn(() => []),
      getMyRecentPath: vi.fn(() => []),
    };

    const collector = new SocialCollector(mockProvider);
    
    // First call should work
    const signal1 = await collector.collect();
    expect(signal1).toBeTruthy();
    
    // Second call within 10s should return cached
    const signal2 = await collector.collect();
    expect(signal2).toBe(signal1); // Same reference
    
    expect(mockProvider.getFriendHeads).toHaveBeenCalledTimes(1);
  });

  it('cleans up on dispose', () => {
    const mockProvider = {
      getFriendHeads: vi.fn(() => []),
      getMyRecentPath: vi.fn(() => []),
    };

    const collector = new SocialCollector(mockProvider);
    collector.dispose?.();
    
    // Should reset internal state
    expect((collector as any).lastSignal).toBeNull();
  });
});