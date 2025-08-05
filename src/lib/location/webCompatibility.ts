/**
 * Web compatibility layer for location services
 * Ensures smooth operation in Lovable.dev preview environment
 */

import { isLovablePreview, hasGeolocation, platformLog } from '@/lib/platform';

// Mock location for development/preview when geolocation is not available
export const MOCK_LOCATIONS = {
  // Venice Beach, CA (default for field testing)
  veniceBeach: { lat: 33.9850, lng: -118.4695, accuracy: 10 },
  // Santa Monica, CA
  santaMonica: { lat: 34.0195, lng: -118.4912, accuracy: 12 },
  // Los Angeles, CA
  losAngeles: { lat: 34.0522, lng: -118.2437, accuracy: 15 },
  // San Francisco, CA
  sanFrancisco: { lat: 37.7749, lng: -122.4194, accuracy: 8 },
  // New York, NY
  newYork: { lat: 40.7128, lng: -74.0060, accuracy: 20 }
};

// Get mock location based on environment or user preference
export const getMockLocation = () => {
  // Check for debug location override
  if (typeof window !== 'undefined') {
    const debugLoc = localStorage.getItem('floq-debug-forceLoc');
    if (debugLoc) {
      try {
        const parsed = JSON.parse(debugLoc);
        if (parsed.lat && parsed.lng) {
          return { ...parsed, accuracy: parsed.accuracy || 10 };
        }
      } catch (e) {
        platformLog.warn('Invalid debug location format:', debugLoc);
      }
    }
  }
  
  // Default to Venice Beach for field testing
  return MOCK_LOCATIONS.veniceBeach;
};

// Enhanced geolocation wrapper for web compatibility
export const getEnhancedGeolocation = () => {
  if (!hasGeolocation) {
    platformLog.warn('Geolocation not available, using mock location');
    return createMockGeolocation();
  }
  
  return {
    getCurrentPosition: (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
      // Add timeout handling for Lovable.dev preview
      const enhancedOptions = {
        enableHighAccuracy: true,
        timeout: isLovablePreview ? 5000 : 10000, // Shorter timeout for preview
        maximumAge: isLovablePreview ? 30000 : 60000, // More frequent updates for preview
        ...options
      };
      
      navigator.geolocation.getCurrentPosition(success, (err) => {
        platformLog.warn('Geolocation error, falling back to mock:', err.message);
        if (isLovablePreview) {
          // In preview, fallback to mock location instead of error
          const mockPos = createMockPosition();
          success(mockPos);
        } else if (error) {
          error(err);
        }
      }, enhancedOptions);
    },
    
    watchPosition: (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => {
      const enhancedOptions = {
        enableHighAccuracy: true,
        timeout: isLovablePreview ? 5000 : 15000,
        maximumAge: isLovablePreview ? 30000 : 60000,
        ...options
      };
      
      const watchId = navigator.geolocation.watchPosition(success, (err) => {
        platformLog.warn('Geolocation watch error:', err.message);
        if (isLovablePreview) {
          // In preview, provide periodic mock updates
          return startMockLocationUpdates(success);
        } else if (error) {
          error(err);
        }
      }, enhancedOptions);
      
      return watchId;
    },
    
    clearWatch: (watchId: number) => {
      if (typeof watchId === 'number' && watchId > 0) {
        navigator.geolocation.clearWatch(watchId);
      } else {
        // Handle mock watch IDs
        clearMockLocationUpdates(watchId);
      }
    }
  };
};

// Create mock geolocation for environments without GPS
const createMockGeolocation = () => {
  let mockWatchId = 1000; // Start with high number to avoid conflicts
  
  return {
    getCurrentPosition: (success: PositionCallback, error?: PositionErrorCallback) => {
      setTimeout(() => {
        const mockPos = createMockPosition();
        success(mockPos);
      }, 100); // Simulate brief delay
    },
    
    watchPosition: (success: PositionCallback, error?: PositionErrorCallback) => {
      const watchId = ++mockWatchId;
      
      // Immediate first position
      setTimeout(() => {
        const mockPos = createMockPosition();
        success(mockPos);
      }, 100);
      
      // Periodic updates with slight variations
      const interval = setInterval(() => {
        const mockPos = createMockPosition(true); // Add slight movement
        success(mockPos);
      }, isLovablePreview ? 5000 : 30000); // More frequent in preview
      
      // Store interval for cleanup
      mockWatchIntervals.set(watchId, interval);
      
      return watchId;
    },
    
    clearWatch: (watchId: number) => {
      clearMockLocationUpdates(watchId);
    }
  };
};

// Mock watch intervals storage
const mockWatchIntervals = new Map<number, NodeJS.Timeout>();

// Create mock position object
const createMockPosition = (addVariation = false): GeolocationPosition => {
  const baseLoc = getMockLocation();
  
  // Add slight random variation for realistic movement simulation
  const variation = addVariation ? {
    lat: baseLoc.lat + (Math.random() - 0.5) * 0.0001, // ~10m variation
    lng: baseLoc.lng + (Math.random() - 0.5) * 0.0001,
    accuracy: baseLoc.accuracy + Math.random() * 5
  } : baseLoc;
  
  return {
    coords: {
      latitude: variation.lat,
      longitude: variation.lng,
      accuracy: variation.accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null
    },
    timestamp: Date.now()
  };
};

// Start mock location updates
const startMockLocationUpdates = (callback: PositionCallback) => {
  const watchId = Date.now(); // Use timestamp as unique ID
  
  const interval = setInterval(() => {
    const mockPos = createMockPosition(true);
    callback(mockPos);
  }, 5000);
  
  mockWatchIntervals.set(watchId, interval);
  return watchId;
};

// Clear mock location updates
const clearMockLocationUpdates = (watchId: number) => {
  const interval = mockWatchIntervals.get(watchId);
  if (interval) {
    clearInterval(interval);
    mockWatchIntervals.delete(watchId);
  }
};

// Export compatibility helpers
export const webLocationHelpers = {
  isLocationAvailable: hasGeolocation || isLovablePreview,
  getMockLocation,
  getEnhancedGeolocation,
  createMockPosition,
  MOCK_LOCATIONS
};

// Initialize web compatibility
if (isLovablePreview) {
  platformLog.debug('Web location compatibility initialized for Lovable.dev preview');
  
  // Set up debug helpers for Lovable.dev
  if (typeof window !== 'undefined') {
    (window as any).__floq_debug = {
      setMockLocation: (lat: number, lng: number, accuracy = 10) => {
        localStorage.setItem('floq-debug-forceLoc', JSON.stringify({ lat, lng, accuracy }));
        platformLog.debug('Mock location set:', { lat, lng, accuracy });
      },
      clearMockLocation: () => {
        localStorage.removeItem('floq-debug-forceLoc');
        platformLog.debug('Mock location cleared');
      },
      getMockLocation,
      MOCK_LOCATIONS
    };
  }
}