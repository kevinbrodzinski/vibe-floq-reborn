/**
 * Performance monitoring and metrics for location system
 * Tracks accuracy, sharing success rates, and system performance
 */

interface LocationMetric {
  timestamp: number;
  accuracy: number;
  lat: number;
  lng: number;
  source: 'gps' | 'network' | 'passive';
  timeToFix: number; // milliseconds from request to fix
}

interface SharingMetric {
  timestamp: number;
  operation: 'broadcast' | 'subscribe' | 'encrypt' | 'decrypt';
  success: boolean;
  duration: number; // milliseconds
  size?: number; // bytes for network operations
  error?: string;
}

interface PerformanceMetric {
  timestamp: number;
  metric: 'memory_usage' | 'battery_level' | 'network_type';
  value: number;
  context?: any;
}

class LocationMetricsCollector {
  private locationMetrics: LocationMetric[] = [];
  private sharingMetrics: SharingMetric[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  
  private readonly MAX_METRICS = 1000; // Keep last 1000 entries
  private readonly METRIC_LIFETIME = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Record location accuracy metric
   */
  recordLocationFix(
    lat: number,
    lng: number,
    accuracy: number,
    source: LocationMetric['source'],
    timeToFix: number
  ): void {
    const metric: LocationMetric = {
      timestamp: Date.now(),
      accuracy,
      lat,
      lng,
      source,
      timeToFix,
    };

    this.locationMetrics.push(metric);
    this.trimMetrics();
    
    // Log exceptional cases
    if (accuracy > 100) {
      console.warn(`[LocationMetrics] Low accuracy: ${accuracy}m`);
    }
    if (timeToFix > 30000) {
      console.warn(`[LocationMetrics] Slow GPS fix: ${timeToFix}ms`);
    }
  }

  /**
   * Record sharing operation metric
   */
  recordSharingOperation(
    operation: SharingMetric['operation'],
    success: boolean,
    duration: number,
    size?: number,
    error?: string
  ): void {
    const metric: SharingMetric = {
      timestamp: Date.now(),
      operation,
      success,
      duration,
      size,
      error,
    };

    this.sharingMetrics.push(metric);
    this.trimMetrics();

    // Log performance issues
    if (!success && error) {
      console.error(`[LocationMetrics] ${operation} failed:`, error);
    }
    if (duration > 5000) {
      console.warn(`[LocationMetrics] Slow ${operation}: ${duration}ms`);
    }
  }

  /**
   * Record performance metric
   */
  recordPerformance(
    metric: PerformanceMetric['metric'],
    value: number,
    context?: any
  ): void {
    const perfMetric: PerformanceMetric = {
      timestamp: Date.now(),
      metric,
      value,
      context,
    };

    this.performanceMetrics.push(perfMetric);
    this.trimMetrics();
  }

  /**
   * Get location accuracy statistics
   */
  getLocationStats(): {
    averageAccuracy: number;
    accuracyTrend: 'improving' | 'degrading' | 'stable';
    averageTimeToFix: number;
    successRate: number;
    recentSamples: number;
  } {
    const recentMetrics = this.getRecentMetrics(this.locationMetrics, 60 * 60 * 1000); // Last hour
    
    if (recentMetrics.length === 0) {
      return {
        averageAccuracy: 0,
        accuracyTrend: 'stable',
        averageTimeToFix: 0,
        successRate: 0,
        recentSamples: 0,
      };
    }

    const avgAccuracy = recentMetrics.reduce((sum, m) => sum + m.accuracy, 0) / recentMetrics.length;
    const avgTimeToFix = recentMetrics.reduce((sum, m) => sum + m.timeToFix, 0) / recentMetrics.length;
    
    // Calculate trend by comparing first and last half
    const trend = this.calculateAccuracyTrend(recentMetrics);
    
    // Success rate (accuracy <= 50m is considered good)
    const goodFixes = recentMetrics.filter(m => m.accuracy <= 50).length;
    const successRate = goodFixes / recentMetrics.length;

    return {
      averageAccuracy: Math.round(avgAccuracy),
      accuracyTrend: trend,
      averageTimeToFix: Math.round(avgTimeToFix),
      successRate: Math.round(successRate * 100) / 100,
      recentSamples: recentMetrics.length,
    };
  }

  /**
   * Get sharing performance statistics
   */
  getSharingStats(): {
    operationStats: Record<string, { successRate: number; avgDuration: number }>;
    totalOperations: number;
    errorRate: number;
    recentErrors: string[];
  } {
    const recentMetrics = this.getRecentMetrics(this.sharingMetrics, 60 * 60 * 1000);
    
    const operationStats: Record<string, { successRate: number; avgDuration: number }> = {};
    const recentErrors: string[] = [];

    for (const operation of ['broadcast', 'subscribe', 'encrypt', 'decrypt'] as const) {
      const opMetrics = recentMetrics.filter(m => m.operation === operation);
      const successful = opMetrics.filter(m => m.success).length;
      const avgDuration = opMetrics.length > 0 
        ? opMetrics.reduce((sum, m) => sum + m.duration, 0) / opMetrics.length 
        : 0;

      operationStats[operation] = {
        successRate: opMetrics.length > 0 ? successful / opMetrics.length : 0,
        avgDuration: Math.round(avgDuration),
      };
    }

    // Collect recent errors
    recentMetrics
      .filter(m => !m.success && m.error)
      .slice(-10) // Last 10 errors
      .forEach(m => m.error && recentErrors.push(m.error));

    const totalOperations = recentMetrics.length;
    const failedOperations = recentMetrics.filter(m => !m.success).length;
    const errorRate = totalOperations > 0 ? failedOperations / totalOperations : 0;

    return {
      operationStats,
      totalOperations,
      errorRate: Math.round(errorRate * 100) / 100,
      recentErrors,
    };
  }

  /**
   * Get performance insights
   */
  getPerformanceInsights(): {
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
    batteryImpact: 'low' | 'medium' | 'high';
    networkQuality: 'good' | 'poor' | 'unknown';
    recommendations: string[];
  } {
    const insights: {
      memoryTrend: 'increasing' | 'decreasing' | 'stable';
      batteryImpact: 'low' | 'medium' | 'high';
      networkQuality: 'good' | 'poor' | 'unknown';
      recommendations: string[];
    } = {
      memoryTrend: 'stable',
      batteryImpact: 'low',
      networkQuality: 'unknown',
      recommendations: [],
    };

    const recentPerf = this.getRecentMetrics(this.performanceMetrics, 30 * 60 * 1000); // Last 30 min

    // Memory trend analysis
    const memoryMetrics = recentPerf.filter(m => m.metric === 'memory_usage');
    if (memoryMetrics.length > 5) {
      const trend = this.calculateTrend(memoryMetrics.map(m => m.value));
      if (trend > 0.1) insights.memoryTrend = 'increasing';
      else if (trend < -0.1) insights.memoryTrend = 'decreasing';
    }

    // Generate recommendations
    const locationStats = this.getLocationStats();
    const sharingStats = this.getSharingStats();

    if (locationStats.averageAccuracy > 100) {
      insights.recommendations.push('GPS accuracy is low - consider moving to an open area');
    }
    if (locationStats.averageTimeToFix > 15000) {
      insights.recommendations.push('GPS fix time is slow - check GPS settings');
    }
    if (sharingStats.errorRate > 0.1) {
      insights.recommendations.push('High sharing error rate - check network connection');
    }
    if (insights.memoryTrend === 'increasing') {
      insights.recommendations.push('Memory usage increasing - consider refreshing the app');
    }

    return insights;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): {
    locationMetrics: LocationMetric[];
    sharingMetrics: SharingMetric[];
    performanceMetrics: PerformanceMetric[];
    summary: {
      locationStats: ReturnType<typeof this.getLocationStats>;
      sharingStats: ReturnType<typeof this.getSharingStats>;
      insights: ReturnType<typeof this.getPerformanceInsights>;
    };
  } {
    return {
      locationMetrics: [...this.locationMetrics],
      sharingMetrics: [...this.sharingMetrics],
      performanceMetrics: [...this.performanceMetrics],
      summary: {
        locationStats: this.getLocationStats(),
        sharingStats: this.getSharingStats(),
        insights: this.getPerformanceInsights(),
      },
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.locationMetrics = [];
    this.sharingMetrics = [];
    this.performanceMetrics = [];
  }

  // Private helper methods

  private trimMetrics(): void {
    const now = Date.now();
    
    // Trim by count
    if (this.locationMetrics.length > this.MAX_METRICS) {
      this.locationMetrics = this.locationMetrics.slice(-this.MAX_METRICS);
    }
    if (this.sharingMetrics.length > this.MAX_METRICS) {
      this.sharingMetrics = this.sharingMetrics.slice(-this.MAX_METRICS);
    }
    if (this.performanceMetrics.length > this.MAX_METRICS) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.MAX_METRICS);
    }

    // Trim by age
    this.locationMetrics = this.locationMetrics.filter(
      m => now - m.timestamp < this.METRIC_LIFETIME
    );
    this.sharingMetrics = this.sharingMetrics.filter(
      m => now - m.timestamp < this.METRIC_LIFETIME
    );
    this.performanceMetrics = this.performanceMetrics.filter(
      m => now - m.timestamp < this.METRIC_LIFETIME
    );
  }

  private getRecentMetrics<T extends { timestamp: number }>(
    metrics: T[],
    maxAge: number
  ): T[] {
    const cutoff = Date.now() - maxAge;
    return metrics.filter(m => m.timestamp > cutoff);
  }

  private calculateAccuracyTrend(metrics: LocationMetric[]): 'improving' | 'degrading' | 'stable' {
    if (metrics.length < 10) return 'stable';

    const mid = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, mid);
    const secondHalf = metrics.slice(mid);

    const firstAvg = firstHalf.reduce((sum, m) => sum + m.accuracy, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.accuracy, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.2) return 'degrading'; // Accuracy getting worse
    if (change < -0.2) return 'improving'; // Accuracy getting better
    return 'stable';
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const xSum = (n * (n - 1)) / 2;
    const ySum = values.reduce((sum, val) => sum + val, 0);
    const xySum = values.reduce((sum, val, i) => sum + i * val, 0);
    const xSquaredSum = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * xySum - xSum * ySum) / (n * xSquaredSum - xSum * xSum);
    return slope;
  }
}

// Singleton instance
export const locationMetrics = new LocationMetricsCollector();

// Helper functions for easy integration
export const recordLocationFix = locationMetrics.recordLocationFix.bind(locationMetrics);
export const recordSharingOperation = locationMetrics.recordSharingOperation.bind(locationMetrics);
export const recordPerformance = locationMetrics.recordPerformance.bind(locationMetrics);