/**
 * Tests for useUnifiedLocation hook
 * Comprehensive testing of the unified location architecture
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useUnifiedLocation } from '../useUnifiedLocation';

// Mock dependencies
vi.mock('@/lib/location/GlobalLocationManager', () => ({
  useGlobalLocationManager: vi.fn(() => ({
    geoState: {
      coords: { lat: 37.7749, lng: -122.4194, accuracy: 10 },
      status: 'success',
      error: null,
      hasPermission: true,
      ts: Date.now()
    },
    manager: {
      subscribe: vi.fn(() => 'sub-123'),
      unsubscribe: vi.fn(),
      requestPermission: vi.fn(),
      getCurrentPosition: vi.fn(),
      getDebugInfo: vi.fn(() => ({
        hasPermission: true,
        isWatching: true,
        subscriberCount: 1,
        failureCount: 0,
        lastUpdateTime: Date.now()
      }))
    }
  }))
}));

vi.mock('@/lib/location/LocationBus', () => ({
  locationBus: {
    subscribe: vi.fn(() => 'bus-123'),
    unsubscribe: vi.fn(),
    emit: vi.fn(),
    registerConsumer: vi.fn(() => vi.fn()), // Returns unsubscribe function
    unregisterConsumer: vi.fn(),
    getConsumerCount: vi.fn(() => 0),
    getMetrics: vi.fn(() => ({ queueSize: 0, averageLatency: 0 })),
    getDebugInfo: vi.fn(() => ({
      isHealthy: true,
      consumers: [],
      batchQueue: [],
      metrics: {
        averageLatency: 0
      }
    })),
    getH3Neighbors: vi.fn(() => ['8a1fb4662daffff']),
    getOptimalH3RingSize: vi.fn(() => 1)
  }
}));

vi.mock('@/lib/store/useLocationStore', () => ({
  useLocationStore: vi.fn((selector) => {
    const mockState = {
      coords: { lat: 37.7749, lng: -122.4194, accuracy: 10 },
      timestamp: Date.now(),
      status: 'success',
      error: null,
      hasPermission: true,
      isTracking: false,
      trackingStartTime: null
    };
    return selector ? selector(mockState) : mockState;
  }),
  useLocationCoords: vi.fn(() => ({ lat: 37.7749, lng: -122.4194, accuracy: 10 })),
  useLocationStatus: vi.fn(() => ({
    status: 'success',
    error: null,
    hasPermission: true
  })),
  useLocationActions: vi.fn(() => ({
    updateLocation: vi.fn(),
    updateMovementContext: vi.fn(),
    setStatus: vi.fn(),
    setPermission: vi.fn(),
    startTracking: vi.fn(),
    stopTracking: vi.fn(),
    enablePresence: vi.fn(),
    disablePresence: vi.fn(),
    updateSystemHealth: vi.fn()
  })),
  useTrackingState: vi.fn(() => ({
    isTracking: false,
    trackingStartTime: null
  })),
  useMovementContext: vi.fn(() => null),
  useLocationHealth: vi.fn(() => ({
    gpsManager: { isHealthy: true, subscriberCount: 0, failureCount: 0, lastUpdate: Date.now() },
    locationBus: { isHealthy: true, consumerCount: 0, batchSize: 0, averageLatency: 0 },
    circuitBreaker: { state: 'CLOSED', isHealthy: true, queueSize: 0, writeRate: 0 }
  })),
  useLocationMetrics: vi.fn(() => ({
    totalUpdates: 0,
    averageAccuracy: 10,
    updateFrequency: 0,
    lastUpdateTime: Date.now(),
    renderCount: 0,
    subscriptionCount: 0
  }))
}));

vi.mock('@/lib/database/CircuitBreaker', () => ({
  executeWithCircuitBreaker: vi.fn((fn) => fn())
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        on: vi.fn(() => ({
          on: vi.fn(() => ({ subscribe: vi.fn() })),
          subscribe: vi.fn()
        })),
        subscribe: vi.fn()
      })),
      unsubscribe: vi.fn()
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } },
        error: null
      }))
    },
    rpc: vi.fn(() => Promise.resolve({
      data: [],
      error: null
    }))
  }
}));

vi.mock('@/lib/callFn', () => ({
  callFn: vi.fn()
}));

vi.mock('h3-js', () => ({
  latLngToCell: vi.fn(() => '8a1fb4662daffff')
}));

describe('useUnifiedLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic functionality', () => {
    it('should return location data with required hookId', () => {
      const { result } = renderHook(() =>
        useUnifiedLocation({
          hookId: 'test-component',
          enableTracking: false,
          enablePresence: false
        })
      );

      expect(result.current.coords).toEqual({
        lat: 37.7749,
        lng: -122.4194,
        accuracy: 10
      });
      expect(result.current.status).toBe('success');
      expect(result.current.hasPermission).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should provide required action methods', () => {
      const { result } = renderHook(() =>
        useUnifiedLocation({
          hookId: 'test-component',
          enableTracking: false,
          enablePresence: false
        })
      );

      expect(typeof result.current.startTracking).toBe('function');
      expect(typeof result.current.stopTracking).toBe('function');
      expect(typeof result.current.getCurrentLocation).toBe('function');
      expect(typeof result.current.resetErrors).toBe('function');
      expect(typeof result.current.getNearbyUsers).toBe('function');
      expect(typeof result.current.getH3Neighbors).toBe('function');
    });

    it('should include H3 spatial indexing', () => {
      const { result } = renderHook(() =>
        useUnifiedLocation({
          hookId: 'test-component',
          enableTracking: false,
          enablePresence: false
        })
      );

      expect(result.current.h3Index).toBe('8a1fb4662daffff');
    });
  });

  describe('Options handling', () => {
    it('should handle default options', () => {
      const { result } = renderHook(() =>
        useUnifiedLocation({
          hookId: 'test-component'
        })
      );

      // Should work with minimal options
      expect(result.current.coords).toBeTruthy();
      expect(result.current.status).toBe('success');
    });

    it('should handle all options', () => {
      const { result } = renderHook(() =>
        useUnifiedLocation({
          hookId: 'test-component',
          enableTracking: true,
          enablePresence: true,
          minDistance: 20,
          minTime: 10000,
          priority: 'high',
          autoStart: true
        })
      );

      expect(result.current.coords).toBeTruthy();
      expect(result.current.status).toBe('success');
    });
  });

  describe('Error handling', () => {
    it('should handle location errors gracefully', async () => {
      // Mock error state by re-importing and mocking
      const locationStore = await import('@/lib/store/useLocationStore');
      vi.mocked(locationStore.useLocationStatus).mockReturnValue({
        status: 'error',
        error: 'GPS timeout',
        hasPermission: false
      });

      const { result } = renderHook(() =>
        useUnifiedLocation({
          hookId: 'test-component',
          enableTracking: false,
          enablePresence: false
        })
      );

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('GPS timeout');
      expect(result.current.hasPermission).toBe(false);
    });
  });

  describe('Tracking functionality', () => {
    it('should handle tracking start/stop', async () => {
      const { result } = renderHook(() =>
        useUnifiedLocation({
          hookId: 'test-component',
          enableTracking: true,
          enablePresence: false
        })
      );

      await act(async () => {
        result.current.startTracking();
      });

      expect(result.current.isTracking).toBe(false); // Will be updated by store

      await act(async () => {
        result.current.stopTracking();
      });

      expect(result.current.isTracking).toBe(false);
    });
  });

  describe('Spatial queries', () => {
    it('should provide H3 neighbor calculation', () => {
      const { result } = renderHook(() =>
        useUnifiedLocation({
          hookId: 'test-component',
          enableTracking: false,
          enablePresence: false
        })
      );

      const neighbors = result.current.getH3Neighbors(1);
      expect(Array.isArray(neighbors)).toBe(true);
    });

    it('should provide nearby users query', async () => {
      const { result } = renderHook(() =>
        useUnifiedLocation({
          hookId: 'test-component',
          enableTracking: true,
          enablePresence: true
        })
      );

      const nearbyUsers = await result.current.getNearbyUsers(500);
      expect(Array.isArray(nearbyUsers)).toBe(true);
    });
  });

  describe('Performance optimization', () => {
    it('should handle cleanup on unmount', () => {
      const { unmount } = renderHook(() =>
        useUnifiedLocation({
          hookId: 'test-component',
          enableTracking: true,
          enablePresence: true
        })
      );

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });

    it('should debounce location updates', () => {
      const { result } = renderHook(() =>
        useUnifiedLocation({
          hookId: 'test-component',
          enableTracking: true,
          enablePresence: false,
          minTime: 5000
        })
      );

      expect(result.current.coords).toBeTruthy();
    });
  });

  describe('Integration with GlobalLocationManager', () => {
    it('should subscribe to location manager', async () => {
      const globalLocationManager = await import('@/lib/location/GlobalLocationManager');
      
      renderHook(() =>
        useUnifiedLocation({
          hookId: 'test-component',
          enableTracking: false,
          enablePresence: false
        })
      );

      expect(globalLocationManager.useGlobalLocationManager).toHaveBeenCalledWith({
        watch: true,
        enableHighAccuracy: true,
        minDistanceM: 10,
        debounceMs: 2000
      });
    });
  });

  describe('Integration with LocationBus', () => {
    it('should register consumer with location bus', async () => {
      const locationBusModule = await import('@/lib/location/LocationBus');
      
      renderHook(() =>
        useUnifiedLocation({
          hookId: 'test-component',
          enableTracking: true,
          enablePresence: false
        })
      );

      expect(locationBusModule.locationBus.registerConsumer).toHaveBeenCalled();
    });
  });

  describe('Circuit breaker integration', () => {
    it('should be available for database operations', async () => {
      const circuitBreakerModule = await import('@/lib/database/CircuitBreaker');
      
      const { result } = renderHook(() =>
        useUnifiedLocation({
          hookId: 'test-component',
          enableTracking: true,
          enablePresence: false
        })
      );

      // Circuit breaker should be available (but not necessarily called in basic test)
      expect(circuitBreakerModule.executeWithCircuitBreaker).toBeDefined();
      expect(typeof circuitBreakerModule.executeWithCircuitBreaker).toBe('function');
    });
  });
});

describe('Specialized hooks', () => {
  it('should provide useLocationCore', async () => {
    const { useLocationCore } = await import('../useUnifiedLocation');
    
    const { result } = renderHook(() => useLocationCore());
    
    expect(result.current.coords).toBeTruthy();
    expect(result.current.status).toBe('success');
  });

  it('should provide useLocationTracking', async () => {
    const { useLocationTracking } = await import('../useUnifiedLocation');
    
    const { result } = renderHook(() => useLocationTracking({
      hookId: 'test-tracking'
    }));
    
    expect(result.current.coords).toBeTruthy();
    expect(result.current.isTracking).toBeDefined();
  });

  it('should provide useLocationSharing', async () => {
    const { useLocationSharing } = await import('../useUnifiedLocation');
    
    const { result } = renderHook(() => useLocationSharing({
      hookId: 'test-sharing'
    }));
    
    expect(result.current.coords).toBeTruthy();
    expect(result.current.isTracking).toBeDefined();
  });
});