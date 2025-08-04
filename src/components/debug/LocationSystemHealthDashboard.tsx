/**
 * Location System Health Dashboard - Monitors performance and health metrics
 * for the unified location system
 */

import React, { useState, useEffect } from 'react';
import { globalLocationManager } from '@/lib/location/GlobalLocationManager';
import { databaseCircuitBreaker } from '@/lib/database/CircuitBreaker';
import { locationBus } from '@/lib/location/LocationBus';
import { useLocationStore } from '@/lib/store/useLocationStore';

interface HealthMetrics {
  locationManager: ReturnType<typeof globalLocationManager.getDebugInfo>;
  circuitBreaker: ReturnType<typeof databaseCircuitBreaker.getStatus>;
  locationBus: ReturnType<typeof locationBus.getDebugInfo>;
  timestamp: number;
}

export const LocationSystemHealthDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const locationStore = useLocationStore();

  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      setMetrics({
        locationManager: globalLocationManager.getDebugInfo(),
        circuitBreaker: databaseCircuitBreaker.getStatus(),
        locationBus: locationBus.getDebugInfo(),
        timestamp: Date.now()
      });
    };

    // Update immediately
    updateMetrics();

    // Update every 2 seconds while visible
    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusColor = (isHealthy: boolean) => {
    return isHealthy ? 'text-green-500' : 'text-red-500';
  };

  const getCircuitStateColor = (state: string) => {
    switch (state) {
      case 'CLOSED': return 'text-green-500';
      case 'HALF_OPEN': return 'text-yellow-500';
      case 'OPEN': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (!import.meta.env.DEV) {
    return null; // Only show in development
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="mb-2 px-3 py-2 bg-gray-800 text-white rounded-lg text-sm font-mono hover:bg-gray-700 transition-colors"
      >
        📊 Location Health
      </button>

      {/* Dashboard Panel */}
      {isVisible && metrics && (
        <div className="bg-black/90 text-white p-4 rounded-lg font-mono text-xs max-w-md border border-gray-600 backdrop-blur">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold">Location System Health</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Location Manager Status */}
          <div className="mb-4">
            <h4 className="text-yellow-400 font-semibold mb-2">GPS Manager</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={getStatusColor(metrics.locationManager.isWatching)}>
                  {metrics.locationManager.isWatching ? 'ACTIVE' : 'IDLE'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Subscribers:</span>
                <span>{metrics.locationManager.subscriberCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Permission:</span>
                <span className={getStatusColor(metrics.locationManager.hasPermission)}>
                  {metrics.locationManager.hasPermission ? 'GRANTED' : 'DENIED'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Failures:</span>
                <span className={getStatusColor(metrics.locationManager.failureCount === 0)}>
                  {metrics.locationManager.failureCount}
                </span>
              </div>
              {metrics.locationManager.lastPosition && (
                <>
                  <div className="flex justify-between">
                    <span>Last Position:</span>
                    <span className="text-green-400">
                      {metrics.locationManager.lastPosition.lat.toFixed(4)}, {metrics.locationManager.lastPosition.lng.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accuracy:</span>
                    <span>{Math.round(metrics.locationManager.lastPosition.accuracy)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Age:</span>
                    <span>{Math.round((Date.now() - metrics.locationManager.lastPosition.timestamp) / 1000)}s</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Location Bus Status */}
          <div className="mb-4">
            <h4 className="text-green-400 font-semibold mb-2">Location Bus</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={getStatusColor(metrics.locationBus.isActive)}>
                  {metrics.locationBus.isActive ? 'ACTIVE' : 'IDLE'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Consumers:</span>
                <span>{metrics.locationBus.consumers.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Batch Size:</span>
                <span>{metrics.locationBus.batchSize}</span>
              </div>
              <div className="flex justify-between">
                <span>Write Rate:</span>
                <span>{metrics.locationBus.metrics.writeRate.toFixed(2)}/min</span>
              </div>
              <div className="flex justify-between">
                <span>Movement History:</span>
                <span>{metrics.locationBus.movementHistory}</span>
              </div>
              {metrics.locationBus.consumers.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-400 mb-1">Active Consumers:</div>
                  {metrics.locationBus.consumers.map((consumer, index) => (
                    <div key={index} className="text-xs text-gray-300 truncate">
                      {consumer.id} ({consumer.type})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Circuit Breaker Status */}
          <div className="mb-4">
            <h4 className="text-blue-400 font-semibold mb-2">Database Protection</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Circuit:</span>
                <span className={getCircuitStateColor(metrics.circuitBreaker.state)}>
                  {metrics.circuitBreaker.state}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active Writes:</span>
                <span>{metrics.circuitBreaker.activeWrites}</span>
              </div>
              <div className="flex justify-between">
                <span>Write Rate:</span>
                <span>{metrics.circuitBreaker.writeRate.toFixed(2)}/s</span>
              </div>
              <div className="flex justify-between">
                <span>Failures:</span>
                <span className={getStatusColor(metrics.circuitBreaker.failureCount === 0)}>
                  {metrics.circuitBreaker.failureCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Throttling:</span>
                <span className={getStatusColor(!metrics.circuitBreaker.isThrottling)}>
                  {metrics.circuitBreaker.isThrottling ? 'YES' : 'NO'}
                </span>
              </div>
              {metrics.circuitBreaker.nextAttemptTime && (
                <div className="flex justify-between">
                  <span>Next Attempt:</span>
                  <span>{formatTime(metrics.circuitBreaker.nextAttemptTime)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Active Subscribers */}
          {metrics.locationManager.subscribers.length > 0 && (
            <div className="mb-4">
              <h4 className="text-purple-400 font-semibold mb-2">Active Subscribers</h4>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {metrics.locationManager.subscribers.map((subscriber, index) => (
                  <div key={index} className="text-gray-300 truncate">
                    {subscriber}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Zustand Store Status */}
          <div className="mb-4">
            <h4 className="text-purple-400 font-semibold mb-2">Location Store</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Tracking:</span>
                <span className={getStatusColor(locationStore.isTracking)}>
                  {locationStore.isTracking ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Has Location:</span>
                <span className={getStatusColor(!!locationStore.coords)}>
                  {locationStore.coords ? 'YES' : 'NO'}
                </span>
              </div>
              {locationStore.coords && (
                <>
                  <div className="flex justify-between">
                    <span>Coordinates:</span>
                    <span className="text-green-400 text-xs">
                      {locationStore.coords.lat.toFixed(4)}, {locationStore.coords.lng.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accuracy:</span>
                    <span>{Math.round(locationStore.coords.accuracy)}m</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span>Movement:</span>
                <span className="text-yellow-400">
                  {locationStore.context?.isStationary ? 'STATIONARY' : 
                   locationStore.context?.isWalking ? 'WALKING' : 
                   locationStore.context?.isDriving ? 'DRIVING' : 'UNKNOWN'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Health:</span>
                <span className={getStatusColor(locationStore.health.isHealthy)}>
                  {locationStore.health.isHealthy ? 'HEALTHY' : 'UNHEALTHY'}
                </span>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-600">
            <button
              onClick={() => globalLocationManager.resetFailures()}
              className="px-2 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-xs"
            >
              Reset GPS
            </button>
            <button
              onClick={() => databaseCircuitBreaker.reset()}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs"
            >
              Reset DB
            </button>
            <button
              onClick={() => locationBus.forceFlush()}
              className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-xs"
            >
              Force Flush
            </button>
            <button
              onClick={() => locationStore.isTracking ? locationStore.stopTracking() : locationStore.startTracking()}
              className={`px-2 py-1 rounded text-xs ${
                locationStore.isTracking 
                  ? 'bg-red-600 hover:bg-red-500' 
                  : 'bg-green-600 hover:bg-green-500'
              }`}
            >
              {locationStore.isTracking ? 'Stop Store' : 'Start Store'}
            </button>
          </div>

          <div className="text-gray-400 text-xs mt-2">
            Updated: {formatTime(metrics.timestamp)}
          </div>
        </div>
      )}
    </div>
  );
};