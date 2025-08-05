/**
 * Unified location context provider with proper error handling
 * Provides location state and services throughout the application
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocationCore } from '@/hooks/location/useLocationCore';
import { LocationErrorHandler, type LocationError } from './errorHandling';
import { locationMetrics, recordLocationFix, recordPerformance } from './metrics';
import { presenceManager } from './presenceManager';
import { toast } from 'sonner';

interface LocationContextState {
  // Core location data
  coords: { lat: number; lng: number } | null;
  accuracy: number | null;
  timestamp: number | null;
  
  // Status and error handling
  status: 'idle' | 'loading' | 'success' | 'error';
  error: LocationError | null;
  hasPermission: boolean | undefined;
  
  // Performance metrics
  metrics: {
    averageAccuracy: number;
    successRate: number;
    errorRate: number;
    recentSamples: number;
  };
  
  // Control functions
  requestLocation: () => void;
  clearError: () => void;
  retryAfterError: () => void;
  
  // Sharing functions
  startSharing: (channelId: string) => Promise<boolean>;
  stopSharing: (channelId: string) => Promise<void>;
  isSharing: boolean;
}

const LocationContext = createContext<LocationContextState | null>(null);

interface LocationProviderProps {
  children: ReactNode;
  options?: {
    enableHighAccuracy?: boolean;
    minDistanceM?: number;
    debounceMs?: number;
    autoRequest?: boolean;
  };
}

export function LocationProvider({ children, options = {} }: LocationProviderProps) {
  const {
    enableHighAccuracy = true,
    minDistanceM = 10,
    debounceMs = 2000,
    autoRequest = true,
  } = options;

  // Core location hook
  const locationCore = useLocationCore({
    enableHighAccuracy,
    minDistanceM,
    debounceMs,
    watch: true,
  });

  // Local state for enhanced error handling
  const [error, setError] = useState<LocationError | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [activeChannels] = useState(new Set<string>());

  // Performance metrics state
  const [metrics, setMetrics] = useState({
    averageAccuracy: 0,
    successRate: 0,
    errorRate: 0,
    recentSamples: 0,
  });

  // Handle location updates and record metrics
  useEffect(() => {
    if (locationCore.status === 'success' && locationCore.coords && locationCore.accuracy) {
      const timeToFix = locationCore.timestamp ? Date.now() - locationCore.timestamp : 0;
      
      recordLocationFix(
        locationCore.coords.lat,
        locationCore.coords.lng,
        locationCore.accuracy,
        'gps',
        timeToFix
      );

      // Clear any previous errors on success
      if (error) {
        setError(null);
        LocationErrorHandler.resetErrorCount(error.type);
      }

      // Update metrics
      updateMetrics();
    }
  }, [locationCore.status, locationCore.coords, locationCore.accuracy, locationCore.timestamp]);

  // Handle errors from location core
  useEffect(() => {
    if (locationCore.status === 'error' && locationCore.error) {
      let locationError: LocationError;

      // Convert string error to LocationError
      if (typeof locationCore.error === 'string') {
        const errorType = mapStringToErrorType(locationCore.error);
        locationError = LocationErrorHandler.createError(
          errorType,
          locationCore.error,
          { source: 'locationCore' }
        );
      } else {
        locationError = locationCore.error as LocationError;
      }

      setError(locationError);
      
      // Show user-friendly toast
      if (locationError.userMessage && locationError.type !== 'permission_denied') {
        toast.error('Location Error', {
          description: locationError.userMessage,
          action: locationError.recoverable ? {
            label: 'Retry',
            onClick: () => retryAfterError(),
          } : undefined,
        });
      }

      updateMetrics();
    }
  }, [locationCore.status, locationCore.error]);

  // Auto-request location on mount if enabled
  useEffect(() => {
    if (autoRequest && locationCore.hasPermission && locationCore.status === 'idle') {
      locationCore.requestLocation();
    }
  }, [autoRequest, locationCore.hasPermission, locationCore.status]);

  // Performance monitoring
  useEffect(() => {
    const monitorPerformance = () => {
      // Monitor memory usage if available
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        recordPerformance('memory_usage', memInfo.usedJSHeapSize / 1024 / 1024); // MB
      }

      // Monitor battery if available
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          recordPerformance('battery_level', battery.level * 100);
        }).catch(() => {
          // Battery API not available
        });
      }

      updateMetrics();
    };

    const interval = setInterval(monitorPerformance, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Helper functions
  function mapStringToErrorType(errorString: string): LocationError['type'] {
    if (errorString.includes('denied')) return 'permission_denied';
    if (errorString.includes('unavailable')) return 'position_unavailable';
    if (errorString.includes('timeout')) return 'timeout';
    return 'unknown';
  }

  function updateMetrics(): void {
    const stats = locationMetrics.getLocationStats();
    const sharingStats = locationMetrics.getSharingStats();
    
    setMetrics({
      averageAccuracy: stats.averageAccuracy,
      successRate: stats.successRate,
      errorRate: sharingStats.errorRate,
      recentSamples: stats.recentSamples,
    });
  }

  function clearError(): void {
    setError(null);
  }

  function retryAfterError(): void {
    if (error && LocationErrorHandler.shouldAllowRetry(error)) {
      setError(null);
      locationCore.requestLocation();
    }
  }

  async function startSharing(channelId: string): Promise<boolean> {
    try {
      if (!locationCore.coords) {
        throw new Error('No location available for sharing');
      }

      await presenceManager.subscribeToPresence(channelId, () => {
        // Handle incoming presence updates
      });

      activeChannels.add(channelId);
      setIsSharing(true);
      
      return true;
    } catch (err) {
      const sharingError = LocationErrorHandler.fromNetworkError(err, 'start_sharing');
      setError(sharingError);
      return false;
    }
  }

  async function stopSharing(channelId: string): Promise<void> {
    try {
      await presenceManager.unsubscribeFromPresence(channelId);
      activeChannels.delete(channelId);
      
      if (activeChannels.size === 0) {
        setIsSharing(false);
      }
    } catch (err) {
      const sharingError = LocationErrorHandler.fromNetworkError(err, 'stop_sharing');
      setError(sharingError);
    }
  }

  // Context value
  const contextValue: LocationContextState = {
    coords: locationCore.coords,
    accuracy: locationCore.accuracy,
    timestamp: locationCore.timestamp,
    status: locationCore.status,
    error,
    hasPermission: locationCore.hasPermission,
    metrics,
    requestLocation: locationCore.requestLocation,
    clearError,
    retryAfterError,
    startSharing,
    stopSharing,
    isSharing,
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
}

/**
 * Hook to access location context
 */
export function useLocationContext(): LocationContextState {
  const context = useContext(LocationContext);
  
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  
  return context;
}

/**
 * Hook for location debugging and monitoring
 */
export function useLocationDebug() {
  const context = useLocationContext();
  
  return {
    exportMetrics: () => locationMetrics.exportMetrics(),
    clearMetrics: () => locationMetrics.clearMetrics(),
    errorStats: LocationErrorHandler.getErrorStats(),
    performanceInsights: locationMetrics.getPerformanceInsights(),
    context,
  };
}