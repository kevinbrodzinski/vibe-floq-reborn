/**
 * System Health Types and Utilities
 */

export interface SystemHealthMetrics {
  overallHealth: number;
  accuracy: number;
  responseTime: number;
  learningProgress: number;
  detailedMetrics?: {
    sensorQuality: Record<string, number>;
    mlConfidence: number;
    featureQuality: number;
    gpsAccuracy: number;
    venueAccuracy: number;
    activeProximityEvents: number;
    proximityConfidence: number;
    avgResponseTime: number;
    cacheHitRate: number;
    memoryUsage: number;
    dbConnected: boolean;
    avgQueryTime: number;
    recordsProcessed: number;
  };
}