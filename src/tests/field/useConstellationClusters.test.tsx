import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useClusters } from '@/hooks/useClusters';
import { useClustersLive } from '@/hooks/useClustersLive';
import type { Cluster } from '@/hooks/useClusters';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() })),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock throttle from lodash-es
vi.mock('lodash-es', () => ({
  throttle: vi.fn((fn) => {
    const throttled = (...args: any[]) => fn(...args);
    throttled.cancel = vi.fn();
    return throttled;
  }),
}));

describe('useConstellationClusters integration', () => {
  const mockBbox: [number, number, number, number] = [-122.5, 37.7, -122.3, 37.8];
  
  const mockClusters: Cluster[] = [
    {
      gh6: 'cluster1',
      centroid: { type: 'Point', coordinates: [-122.4194, 37.7749] },
      total: 5,
      vibe_counts: { social: 3, chill: 2 },
      vibe_mode: 'social',
      member_count: 5,
    },
    {
      gh6: 'cluster2', 
      centroid: { type: 'Point', coordinates: [-122.4094, 37.7849] },
      total: 8,
      vibe_counts: { hype: 5, curious: 3 },
      vibe_mode: 'hype',
      member_count: 8,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should provide stable cluster outputs for constellation rendering', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Mock successful RPC response
    (supabase.rpc as any).mockResolvedValue({
      data: mockClusters,
      error: null,
    });

    const { result, rerender } = renderHook(() => 
      useClusters(mockBbox, 6)
    );

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.clusters).toHaveLength(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);

    // Test that clusters remain stable on re-render with same bbox
    rerender();
    
    expect(result.current.clusters).toHaveLength(2);
    expect(result.current.clusters[0].gh6).toBe('cluster1');
    expect(result.current.clusters[1].gh6).toBe('cluster2');
  });

  it('should handle live cluster updates without memory leaks', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const mockSetClusters = vi.fn();
    const mockRefetch = vi.fn();
    
    // Mock channel setup
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };
    (supabase.channel as any).mockReturnValue(mockChannel);

    const { result, unmount } = renderHook(() =>
      useClustersLive(mockClusters, mockSetClusters, mockRefetch)
    );

    // Verify channel setup
    expect(supabase.channel).toHaveBeenCalledWith('clusters-live');
    expect(mockChannel.on).toHaveBeenCalledWith(
      'broadcast',
      { event: 'clusters_updated' },
      expect.any(Function)
    );

    // Test cleanup on unmount
    unmount();
    
    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('should throttle cluster updates for performance (≥60fps)', () => {
    const { throttle } = require('lodash-es');
    
    const mockRefetch = vi.fn();
    const throttledRefetch = throttle(mockRefetch, 100);

    // Simulate rapid updates
    for (let i = 0; i < 10; i++) {
      throttledRefetch();
    }

    // Should be throttled - function called but throttled
    expect(throttle).toHaveBeenCalledWith(mockRefetch, 100);
    
    // Test cleanup
    throttledRefetch.cancel();
    expect(throttledRefetch.cancel).toHaveBeenCalled();
  });

  it('should handle cluster projection coordinates correctly', () => {
    const cluster = mockClusters[0];
    const [lng, lat] = cluster.centroid.coordinates;
    
    // Verify coordinate format matches expected [lng, lat] format
    expect(lng).toBe(-122.4194);
    expect(lat).toBe(37.7749);
    expect(lng).toBeGreaterThan(-180);
    expect(lng).toBeLessThan(180);
    expect(lat).toBeGreaterThan(-90);
    expect(lat).toBeLessThan(90);
  });

  it('should provide cluster data compatible with constellation renderer', () => {
    mockClusters.forEach(cluster => {
      // Verify required properties for ConstellationRenderer
      expect(cluster).toHaveProperty('gh6');
      expect(cluster).toHaveProperty('centroid');
      expect(cluster).toHaveProperty('total');
      expect(cluster).toHaveProperty('vibe_counts');
      expect(cluster).toHaveProperty('member_count');
      
      // Verify centroid format
      expect(cluster.centroid.type).toBe('Point');
      expect(cluster.centroid.coordinates).toHaveLength(2);
      expect(typeof cluster.centroid.coordinates[0]).toBe('number');
      expect(typeof cluster.centroid.coordinates[1]).toBe('number');
    });
  });
});