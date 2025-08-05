/**
 * Enhanced Location System Health Dashboard - Comprehensive monitoring
 * for the advanced location architecture with useGeo foundation
 */

import React, { useState, useEffect } from 'react';
import { globalLocationManager } from '@/lib/location/GlobalLocationManager';
import { databaseCircuitBreaker } from '@/lib/database/CircuitBreaker';
import { locationBus } from '@/lib/location/LocationBus';
import { useLocationHealth, useLocationMetrics, useLocationCoords, useLocationStatus } from '@/lib/store/useLocationStore';

interface HealthMetrics {
  locationManager: ReturnType<typeof globalLocationManager.getDebugInfo>;
  circuitBreaker: ReturnType<typeof databaseCircuitBreaker.getStatus>;
  locationBus: ReturnType<typeof locationBus.getDebugInfo>;
  timestamp: number;
}

export const LocationSystemHealthDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'gps' | 'bus' | 'circuit' | 'store'>('overview');
  
  // Zustand store data
  const systemHealth = useLocationHealth();
  const storeMetrics = useLocationMetrics();
  const coords = useLocationCoords();
  const status = useLocationStatus();

  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      try {
        setMetrics({
          locationManager: globalLocationManager.getDebugInfo(),
          circuitBreaker: databaseCircuitBreaker.getStatus(),
          locationBus: locationBus.getDebugInfo(),
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('[HealthDashboard] Failed to update metrics:', error);
      }
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
    return isHealthy ? 'text-green-400' : 'text-red-400';
  };

  const getCircuitStateColor = (state: string) => {
    switch (state) {
      case 'CLOSED': return 'text-green-400';
      case 'HALF_OPEN': return 'text-yellow-400';
      case 'OPEN': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatNumber = (num: number, decimals = 2) => {
    return num.toFixed(decimals);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!import.meta.env.DEV) {
    return null; // Only show in development
  }

  const healthScore = systemHealth ? Math.min(100, systemHealth.gpsManager.isHealthy ? 100 : 50) : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`mb-2 px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
          healthScore >= 80 
            ? 'bg-green-800 text-green-100 hover:bg-green-700' 
            : healthScore >= 60 
            ? 'bg-yellow-800 text-yellow-100 hover:bg-yellow-700'
            : 'bg-red-800 text-red-100 hover:bg-red-700'
        }`}
      >
        📊 Health: {healthScore}%
      </button>

      {/* Dashboard Panel */}
      {isVisible && (
        <div className="bg-black/95 text-white p-4 rounded-lg font-mono text-xs max-w-2xl border border-gray-600 backdrop-blur max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold">Location System Health Dashboard</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-2 mb-4 border-b border-gray-700">
            {['overview', 'gps', 'bus', 'circuit', 'store'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab as any)}
                className={`px-2 py-1 text-xs capitalize transition-colors ${
                  selectedTab === tab 
                    ? 'text-blue-400 border-b-2 border-blue-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-blue-400 font-semibold mb-2">System Status</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Overall Health:</span>
                      <span className={getStatusColor(healthScore >= 80)}>
                        {healthScore}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>GPS Status:</span>
                      <span className={getStatusColor(status === 'success')}>
                        {status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Permission:</span>
                      <span className={getStatusColor(coords !== null)}>
                        {coords ? 'GRANTED' : 'DENIED'}
                      </span>
                    </div>
                    {coords && (
                      <div className="flex justify-between">
                        <span>Accuracy:</span>
                        <span className={getStatusColor(coords.accuracy < 50)}>
                          {formatNumber(coords.accuracy)}m
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-blue-400 font-semibold mb-2">Performance</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Total Updates:</span>
                      <span>{storeMetrics.totalUpdates}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Update Rate:</span>
                      <span>{formatNumber(storeMetrics.updateFrequency)}/min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Accuracy:</span>
                      <span>{formatNumber(storeMetrics.averageAccuracy)}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Subscriptions:</span>
                      <span>{storeMetrics.subscriptionCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {status === 'error' && (
                <div className="bg-red-900/50 border border-red-600 p-2 rounded">
                  <div className="text-red-400 font-semibold">Status:</div>
                  <div className="text-red-300 text-xs">Location Error</div>
                </div>
              )}
            </div>
          )}

          {/* GPS Manager Tab */}
          {selectedTab === 'gps' && metrics && (
            <div>
              <h4 className="text-yellow-400 font-semibold mb-2">GPS Manager (useGeo Foundation)</h4>
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
                <div className="flex justify-between">
                  <span>Total Updates:</span>
                  <span>{metrics.locationManager.totalUpdates}</span>
                </div>
                <div className="flex justify-between">
                  <span>GPS Accuracy:</span>
                  <span className={getStatusColor(metrics.locationManager.gpsAccuracy < 50)}>
                    {formatNumber(metrics.locationManager.gpsAccuracy)}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last Update:</span>
                  <span className="text-gray-400">
                    {metrics.locationManager.lastUpdateTime 
                      ? formatTime(metrics.locationManager.lastUpdateTime)
                      : 'Never'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Location Bus Tab */}
          {selectedTab === 'bus' && metrics && (
            <div>
              <h4 className="text-purple-400 font-semibold mb-2">Location Bus</h4>
              <div className="space-y-1 mb-3">
                <div className="flex justify-between">
                  <span>Health:</span>
                  <span className={getStatusColor(metrics.locationBus.isHealthy)}>
                    {metrics.locationBus.isHealthy ? 'HEALTHY' : 'DEGRADED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Consumers:</span>
                  <span>{metrics.locationBus.consumers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Batch Queue:</span>
                  <span className={getStatusColor(metrics.locationBus.batchQueue.length < 25)}>
                    {metrics.locationBus.batchQueue.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Latency:</span>
                  <span className={getStatusColor(metrics.locationBus.metrics.averageLatency < 100)}>
                    {formatNumber(metrics.locationBus.metrics.averageLatency)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Error Rate:</span>
                  <span className={getStatusColor(metrics.locationBus.metrics.errorRate < 0.1)}>
                    {formatNumber(metrics.locationBus.metrics.errorRate * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Write Rate:</span>
                  <span>{formatNumber(metrics.locationBus.metrics.writeRate)}/min</span>
                </div>
              </div>
              
              {metrics.locationBus.consumers.length > 0 && (
                <div>
                  <div className="text-gray-400 text-xs mb-1">Active Consumers:</div>
                  <div className="max-h-20 overflow-y-auto space-y-1">
                    {metrics.locationBus.consumers.slice(0, 5).map((consumer) => (
                      <div key={consumer.id} className="flex justify-between text-xs">
                        <span className="truncate">{consumer.id}</span>
                        <span className={`text-${consumer.priority === 'high' ? 'red' : consumer.priority === 'medium' ? 'yellow' : 'green'}-400`}>
                          {consumer.priority}
                        </span>
                      </div>
                    ))}
                    {metrics.locationBus.consumers.length > 5 && (
                      <div className="text-gray-500 text-xs">
                        +{metrics.locationBus.consumers.length - 5} more...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Circuit Breaker Tab */}
          {selectedTab === 'circuit' && metrics && (
            <div>
              <h4 className="text-orange-400 font-semibold mb-2">Database Circuit Breaker</h4>
              <div className="space-y-1 mb-3">
                <div className="flex justify-between">
                  <span>State:</span>
                  <span className={getCircuitStateColor(metrics.circuitBreaker.state)}>
                    {metrics.circuitBreaker.state}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Queue Size:</span>
                  <span className={getStatusColor(metrics.circuitBreaker.queueSize < 50)}>
                    {metrics.circuitBreaker.queueSize}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Active Writes:</span>
                  <span>{metrics.circuitBreaker.activeWrites}</span>
                </div>
                <div className="flex justify-between">
                  <span>Write Rate:</span>
                  <span>{formatNumber(metrics.circuitBreaker.writeRate)}/s</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate:</span>
                  <span className={getStatusColor(metrics.circuitBreaker.successCount > metrics.circuitBreaker.failureCount)}>
                    {formatNumber((metrics.circuitBreaker.successCount / Math.max(1, metrics.circuitBreaker.totalOperations)) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Response:</span>
                  <span className={getStatusColor(metrics.circuitBreaker.averageResponseTime < 1000)}>
                    {formatNumber(metrics.circuitBreaker.averageResponseTime)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span className={getStatusColor(metrics.circuitBreaker.uptimePercentage > 95)}>
                    {formatNumber(metrics.circuitBreaker.uptimePercentage)}%
                  </span>
                </div>
              </div>

              <div>
                <div className="text-gray-400 text-xs mb-1">Priority Distribution:</div>
                <div className="flex space-x-2 text-xs">
                  <span className="text-red-400">H: {metrics.circuitBreaker.priorityDistribution.high}</span>
                  <span className="text-yellow-400">M: {metrics.circuitBreaker.priorityDistribution.medium}</span>
                  <span className="text-green-400">L: {metrics.circuitBreaker.priorityDistribution.low}</span>
                </div>
              </div>
            </div>
          )}

          {/* Zustand Store Tab */}
          {selectedTab === 'store' && (
            <div>
              <h4 className="text-green-400 font-semibold mb-2">Zustand Location Store</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Has Coords:</span>
                  <span className={getStatusColor(!!coords)}>
                    {coords ? 'YES' : 'NO'}
                  </span>
                </div>
                {coords && (
                  <>
                    <div className="flex justify-between">
                      <span>Latitude:</span>
                      <span>{formatNumber(coords.lat, 6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Longitude:</span>
                      <span>{formatNumber(coords.lng, 6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accuracy:</span>
                      <span>{formatNumber(coords.accuracy)}m</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span>GPS Health:</span>
                  <span className={getStatusColor(systemHealth?.gpsManager?.isHealthy || false)}>
                    {systemHealth?.gpsManager?.isHealthy ? '✓' : '✗'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Bus Health:</span>
                  <span className={getStatusColor(systemHealth?.locationBus?.isHealthy || false)}>
                    {systemHealth?.locationBus?.isHealthy ? '✓' : '✗'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Circuit Health:</span>
                  <span className={getStatusColor(systemHealth?.circuitBreaker?.isHealthy || false)}>
                    {systemHealth?.circuitBreaker?.isHealthy ? '✓' : '✗'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Updates:</span>
                  <span>{storeMetrics?.totalUpdates || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subscriptions:</span>
                  <span>{storeMetrics?.subscriptionCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Renders:</span>
                  <span>{storeMetrics?.renderCount || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-2 border-t border-gray-700 text-gray-500 text-xs">
            Last updated: {metrics ? formatTime(metrics.timestamp) : 'Never'}
          </div>
        </div>
      )}
    </div>
  );
};