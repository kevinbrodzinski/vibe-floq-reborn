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


// Mock lodash-es with proper exports
vi.mock('lodash-es', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    throttle: vi.fn((fn) => {
      const throttled = (...args: any[]) => fn(...args);
      throttled.cancel = vi.fn();
      return throttled;
    }),
    debounce: vi.fn((fn) => {
      const debounced = (...args: any[]) => fn(...args);
      debounced.cancel = vi.fn();
      return debounced;
    }),
  };
});


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

    const { unmount } = renderHook(() =>
      useClustersLive(mockClusters, mockSetClusters, mockRefetch)
    );

    expect(supabase.channel).toHaveBeenCalledWith('clusters-live');

    // Cleanup should remove channel
    unmount();
    expect(supabase.removeChannel).toHaveBeenCalled();
  });

  it('should set up live subscription channel correctly', async () => {
    const mockRefetch = vi.fn();
    
    // Mock channel setup
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };

    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.channel as any).mockReturnValue(mockChannel);

    // Test live subscription setup
    renderHook(() => useClustersLive(mockClusters, vi.fn(), mockRefetch));
    
    // Verify channel was set up correctly
    expect(supabase.channel).toHaveBeenCalledWith('clusters-live');
    expect(mockChannel.on).toHaveBeenCalledWith('broadcast', { event: 'clusters_updated' }, expect.any(Function));
    expect(mockChannel.subscribe).toHaveBeenCalled();

  });

  it('should handle cluster projection coordinates correctly', () => {
    const cluster = mockClusters[0];
    
    // Test coordinate extraction
    const [lng, lat] = cluster.centroid.coordinates;
    expect(typeof lng).toBe('number');
    expect(typeof lat).toBe('number');
    expect(lng).toBeCloseTo(-122.4194, 4);
    expect(lat).toBeCloseTo(37.7749, 4);
  });

  it('should provide cluster data compatible with constellation renderer', () => {
    // Test that cluster data has all required fields for ConstellationRenderer
    mockClusters.forEach(cluster => {

      expect(cluster).toHaveProperty('gh6');
      expect(cluster).toHaveProperty('centroid');
      expect(cluster).toHaveProperty('total');
      expect(cluster).toHaveProperty('vibe_counts');
      expect(cluster).toHaveProperty('vibe_mode');
      expect(cluster).toHaveProperty('member_count');
      
      // Verify centroid structure
      expect(cluster.centroid.type).toBe('Point');
      expect(cluster.centroid.coordinates).toHaveLength(2);
      expect(typeof cluster.centroid.coordinates[0]).toBe('number'); // lng
      expect(typeof cluster.centroid.coordinates[1]).toBe('number'); // lat
    });
  });

  it('should handle empty cluster arrays gracefully', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Mock empty response
    (supabase.rpc as any).mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => 
      useClusters(mockBbox, 6)
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.clusters).toHaveLength(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle RPC errors gracefully', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Mock error response
    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    });

    const { result } = renderHook(() => 
      useClusters(mockBbox, 6)
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.clusters).toHaveLength(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Database connection failed');

  });
});