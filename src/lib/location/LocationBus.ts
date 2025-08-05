/**
 * Location Bus Singleton - Central coordinator for all location operations
 * Integrates with GlobalLocationManager (useGeo foundation) for smart distribution
 * Implements smart batching, context-aware throttling, and performance monitoring
 * V2 ENHANCEMENT: Hybrid H3/Geohash spatial indexing for hosted Supabase
 */

import { latLngToCell, gridDisk } from 'h3-js';
import { globalLocationManager } from './GlobalLocationManager';
import { executeWithCircuitBreaker } from '@/lib/database/CircuitBreaker';
import { supabase } from '@/integrations/supabase/client';
import { calculateDistance } from '@/lib/location/standardGeo';
import type { GeoCoords, LocationConsumer, MovementContext } from './types';
import { callFn } from '@/lib/callFn';
import { isLovablePreview, platformLog, getCurrentPlatformConfig } from '@/lib/platform/index';

// Enhanced LocationBatch with spatial indexing
interface LocationBatch {
  ts: string;
  lat: number;
  lng: number;
  acc: number;
  h3_idx?: bigint; // V2: Client-computed H3 index
  context?: MovementContext;
}

interface MovementContext {
  isStationary: boolean;
  isWalking: boolean;
  isDriving: boolean;
  speed: number; // m/s
  heading?: number;
  confidence: number; // 0-1
}

interface PerformanceMetrics {
  totalConsumers: number;
  activeConsumers: number;
  batchSize: number;
  writeRate: number; // writes per minute
  gpsAccuracy: number;
  lastFlushTime: number;
  contextDetectionAccuracy: number;
  averageLatency: number;
  errorRate: number;
  spatialIndexingEnabled: boolean; // V2: Track spatial indexing usage
  h3ComputationTime: number; // V2: H3 computation performance
}

interface BusDebugInfo {
  consumers: Array<{
    id: string;
    type: string;
    priority: string;
    lastUpdate: number;
    updateCount: number;
  }>;
  metrics: PerformanceMetrics;
  batchQueue: LocationBatch[];
  isHealthy: boolean;
}

class LocationBus {
  private consumers: Map<string, LocationConsumer> = new Map();
  private batchQueue: LocationBatch[] = [];
  private lastFlushTime = 0;
  private flushIntervalId: number | null = null;
  private lastPosition: { lat: number; lng: number; accuracy: number; timestamp: number } | null = null;
  private movementContext: MovementContext | null = null;
  private performanceMetrics: PerformanceMetrics;
  private consumerStats: Map<string, { lastUpdate: number; updateCount: number; errors: number }> = new Map();
  
  // Adaptive flush intervals based on movement context
  private readonly FLUSH_INTERVALS = {
    stationary: 60000, // 60 seconds when not moving
    walking: 30000,    // 30 seconds when walking
    driving: 15000     // 15 seconds when driving
  };
  
  private static instance: LocationBus | null = null;
  private globalManagerSubscription: (() => void) | null = null;
  
  constructor() {
    this.performanceMetrics = {
      totalConsumers: 0,
      activeConsumers: 0,
      batchSize: 0,
      writeRate: 0,
      gpsAccuracy: 0,
      lastFlushTime: 0,
      contextDetectionAccuracy: 0.8,
      averageLatency: 0,
      errorRate: 0,
      spatialIndexingEnabled: false, // V2: Initialize spatial indexing flag
      h3ComputationTime: 0 // V2: Initialize H3 computation time
    };
    
    this.initializeGlobalManagerSubscription();
    this.startAdaptiveFlushTimer();
  }
  
  static getInstance(): LocationBus {
    if (!LocationBus.instance) {
      LocationBus.instance = new LocationBus();
    }
    return LocationBus.instance;
  }
  
  private initializeGlobalManagerSubscription() {
    // Subscribe to GlobalLocationManager for location updates
    this.globalManagerSubscription = globalLocationManager.subscribe({
      id: 'location-bus-coordinator',
      callback: (coords) => this.handleLocationUpdate(coords),
      errorCallback: (error) => this.handleLocationError(error),
      options: {
        priority: 'high',
        minDistance: 5, // 5 meter minimum distance
        minTime: 5000   // 5 second minimum time
      }
    });
  }
  
  private handleLocationUpdate(coords: { lat: number; lng: number; accuracy: number; timestamp: number }) {
    this.lastPosition = coords;
    this.updateMovementContext(coords);
    
    // V2 ENHANCEMENT: Compute H3 index client-side for spatial indexing
    const enhancedCoords = this.enhanceWithSpatialIndexes(coords);
    
    this.distributeToConsumers(enhancedCoords);
    this.updatePerformanceMetrics();
    
    // Add to batch queue for database operations with spatial indexes
    this.addToBatch({
      ts: new Date(coords.timestamp).toISOString(),
      lat: coords.lat,
      lng: coords.lng,
      acc: coords.accuracy,
      h3_idx: enhancedCoords.h3_idx, // V2: Include H3 index for database
      context: this.movementContext
    });
  }
  
  /**
   * V2 ENHANCEMENT: Enhance coordinates with spatial indexes (H3)
   * Computes H3 index client-side for fast neighbor queries
   */
  private enhanceWithSpatialIndexes(coords: { lat: number; lng: number; accuracy: number; timestamp: number }): 
    { lat: number; lng: number; accuracy: number; timestamp: number; h3_idx?: bigint } {
    try {
      const h3Start = performance.now();
      
      // Compute H3 index at resolution 8 (≈460m hex size, good for neighbor queries)
      const h3Index = latLngToCell(coords.lat, coords.lng, 8);
      const h3Idx = BigInt(h3Index);
      
      // Track H3 computation performance
      const h3Time = performance.now() - h3Start;
      this.performanceMetrics.h3ComputationTime = 
        (this.performanceMetrics.h3ComputationTime * 0.9) + (h3Time * 0.1); // Moving average
      this.performanceMetrics.spatialIndexingEnabled = true;
      
      return {
        ...coords,
        h3_idx: h3Idx
      };
    } catch (error) {
      console.warn('[LocationBus] H3 computation failed, using coordinates without spatial index:', error);
      this.performanceMetrics.spatialIndexingEnabled = false;
      return coords;
    }
  }

  /**
   * V2 ENHANCEMENT: Get H3 neighbors for proximity queries
   * Returns H3 cell IDs in a ring around the given coordinates
   */
  public getH3Neighbors(lat: number, lng: number, ringSize: number = 1): bigint[] {
    try {
          const centerH3 = latLngToCell(lat, lng, 8);
    const ring = gridDisk(centerH3, ringSize);
      return ring.map(h3 => BigInt(h3));
    } catch (error) {
      console.warn('[LocationBus] H3 neighbor computation failed:', error);
      return [];
    }
  }

  /**
   * V2 ENHANCEMENT: Get optimal ring size for a given radius in meters
   * H3 resolution 8 has ~460m edge length
   */
  public getOptimalH3RingSize(radiusMeters: number): number {
    const h3EdgeLength = 460; // meters for resolution 8
    return Math.max(1, Math.ceil(radiusMeters / h3EdgeLength));
  }

  private handleLocationError(error: string) {
    console.error('[LocationBus] GPS error:', error);
    this.performanceMetrics.errorRate++;
    
    // Notify consumers of error
    this.consumers.forEach((consumer, id) => {
      if (consumer.errorCallback) {
        try {
          consumer.errorCallback(new Error(error));
        } catch (callbackError) {
          console.error(`[LocationBus] Consumer ${id} error callback failed:`, callbackError);
        }
      }
    });
  }
  
  private updateMovementContext(coords: { lat: number; lng: number; accuracy: number; timestamp: number }) {
    if (!this.lastPosition) {
      this.movementContext = {
        isStationary: true,
        isWalking: false,
        isDriving: false,
        speed: 0,
        confidence: 1.0
      };
      return;
    }
    
    const distance = calculateDistance(
      this.lastPosition.lat, this.lastPosition.lng,
      coords.lat, coords.lng
    );
    
    const timeDiff = (coords.timestamp - this.lastPosition.timestamp) / 1000; // seconds
    const speed = timeDiff > 0 ? distance / timeDiff : 0; // m/s
    
    // Classification based on speed
    const isStationary = speed < 0.5;  // < 0.5 m/s (1.8 km/h)
    const isWalking = speed >= 0.5 && speed < 2.5; // 0.5-2.5 m/s (1.8-9 km/h)
    const isDriving = speed >= 2.5; // > 2.5 m/s (9 km/h)
    
    // Calculate confidence based on GPS accuracy and time stability
    const accuracyFactor = Math.max(0.1, Math.min(1.0, 50 / coords.accuracy));
    const timeFactor = Math.min(1.0, timeDiff / 10); // More confident with longer time intervals
    const confidence = (accuracyFactor + timeFactor) / 2;
    
    this.movementContext = {
      isStationary,
      isWalking,
      isDriving,
      speed,
      confidence
    };
  }
  
  private distributeToConsumers(coords: { lat: number; lng: number; accuracy: number; timestamp: number }) {
    // Sort consumers by priority (high -> medium -> low)
    const sortedConsumers = Array.from(this.consumers.entries()).sort(([, a], [, b]) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    const startTime = performance.now();
    let successCount = 0;
    let errorCount = 0;
    
    for (const [id, consumer] of sortedConsumers) {
      try {
        const shouldNotify = this.shouldNotifyConsumer(consumer, coords);
        if (shouldNotify) {
          consumer.callback(coords);
          successCount++;
          
          // Update consumer stats
          const stats = this.consumerStats.get(id) || { lastUpdate: 0, updateCount: 0, errors: 0 };
          stats.lastUpdate = coords.timestamp;
          stats.updateCount++;
          this.consumerStats.set(id, stats);
        }
      } catch (error) {
        console.error(`[LocationBus] Consumer ${id} callback failed:`, error);
        errorCount++;
        
        // Update error stats
        const stats = this.consumerStats.get(id) || { lastUpdate: 0, updateCount: 0, errors: 0 };
        stats.errors++;
        this.consumerStats.set(id, stats);
        
        // Remove failing consumers after 5 errors
        if (stats.errors >= 5) {
          console.warn(`[LocationBus] Removing failing consumer: ${id}`);
          this.consumers.delete(id);
          this.consumerStats.delete(id);
        }
      }
    }
    
    // Update performance metrics
    const endTime = performance.now();
    const latency = endTime - startTime;
    this.performanceMetrics.averageLatency = 
      (this.performanceMetrics.averageLatency * 0.9) + (latency * 0.1); // Exponential moving average
    this.performanceMetrics.errorRate = errorCount / (successCount + errorCount) || 0;
  }
  
  private shouldNotifyConsumer(
    consumer: LocationConsumer, 
    coords: { lat: number; lng: number; accuracy: number; timestamp: number }
  ): boolean {
    const options = consumer.options || {};
    const stats = this.consumerStats.get(consumer.id);
    
    // Check minimum time interval
    if (options.minTime && stats?.lastUpdate) {
      const timeDiff = coords.timestamp - stats.lastUpdate;
      if (timeDiff < options.minTime) {
        return false;
      }
    }
    
    // Check minimum distance
    if (options.minDistance && this.lastPosition) {
      const distance = calculateDistance(
        this.lastPosition.lat, this.lastPosition.lng,
        coords.lat, coords.lng
      );
      if (distance < options.minDistance) {
        return false;
      }
    }
    
    return true;
  }
  
  private addToBatch(location: LocationBatch) {
    this.batchQueue.push(location);
    this.performanceMetrics.batchSize = this.batchQueue.length;
    
    // Auto-flush if batch gets too large (safety mechanism)
    if (this.batchQueue.length >= 50) {
      this.flushBatch();
    }
  }
  
  private startAdaptiveFlushTimer() {
    const updateFlushInterval = () => {
      if (this.flushIntervalId) {
        clearInterval(this.flushIntervalId);
      }
      
      // Determine flush interval based on movement context
      let interval = this.FLUSH_INTERVALS.stationary; // Default
      
      if (this.movementContext) {
        if (this.movementContext.isDriving) {
          interval = this.FLUSH_INTERVALS.driving;
        } else if (this.movementContext.isWalking) {
          interval = this.FLUSH_INTERVALS.walking;
        }
      }
      
      this.flushIntervalId = window.setInterval(() => {
        this.flushBatch();
      }, interval);
    };
    
    // Initial setup
    updateFlushInterval();
    
    // Update interval every 30 seconds based on current movement context
    setInterval(updateFlushInterval, 30000);
  }
  
  private async flushBatch() {
    if (this.batchQueue.length === 0) return;
    
    const batch = [...this.batchQueue];
    this.batchQueue = [];
    this.performanceMetrics.batchSize = 0;
    this.performanceMetrics.lastFlushTime = Date.now();
    
    try {
      // V2 ENHANCEMENT: Use circuit breaker with enhanced batch function
      await executeWithCircuitBreaker(async () => {
        // Prepare batch with spatial indexing data
        const enhancedBatch = batch.map(b => ({
          ts: b.ts,
          lat: b.lat,
          lng: b.lng,
          acc: b.acc,
          timestamp: new Date(b.ts).getTime(), // Convert to timestamp for RPC
          h3_idx: b.h3_idx // V2: Include H3 index
        }));

        // Use V2 batch function with spatial indexing
        const { data, error } = await supabase.rpc('batch_location_update_v2', {
          p_locations: enhancedBatch,
          p_priority: 'medium'
        });
        
        if (error) {
          throw new Error(`V2 batch write failed: ${error.message}`);
        }

        // Log V2 spatial indexing success
        if (import.meta.env.MODE === 'development') {
          platformLog.debug('[LocationBus] V2 batch processed:', {
            processed: data?.processed || batch.length,
            spatial_strategy: data?.spatial_strategy || 'geohash6_h3_hybrid',
            duration_ms: data?.duration_ms
          });
        }
      }, 'medium');
      
      // Update write rate metrics
      const now = Date.now();
      const timeSinceLastFlush = now - this.lastFlushTime;
      if (timeSinceLastFlush > 0) {
        this.performanceMetrics.writeRate = (batch.length / timeSinceLastFlush) * 60000; // per minute
      }
      this.lastFlushTime = now;
      
    } catch (error) {
      console.error('[LocationBus] V2 batch flush failed:', error);
      
      // Re-queue batch for retry (with limit to prevent infinite growth)
      if (this.batchQueue.length < 100) {
        this.batchQueue.unshift(...batch);
        this.performanceMetrics.batchSize = this.batchQueue.length;
      }
    }
  }
  
  private updatePerformanceMetrics() {
    this.performanceMetrics.totalConsumers = this.consumers.size;
    this.performanceMetrics.activeConsumers = Array.from(this.consumerStats.values())
      .filter(stats => Date.now() - stats.lastUpdate < 60000).length;
    this.performanceMetrics.gpsAccuracy = this.lastPosition?.accuracy || 0;
  }
  
  /**
   * Register a location consumer
   */
  registerConsumer(consumer: LocationConsumer): () => void {
    this.consumers.set(consumer.id, consumer);
    this.consumerStats.set(consumer.id, { lastUpdate: 0, updateCount: 0, errors: 0 });
    
    // Immediately provide last known position if available
    if (this.lastPosition) {
      try {
        consumer.callback(this.lastPosition);
      } catch (error) {
        console.error(`[LocationBus] Initial callback failed for ${consumer.id}:`, error);
      }
    }
    
    this.updatePerformanceMetrics();
    
    // Return unsubscribe function
    return () => {
      this.consumers.delete(consumer.id);
      this.consumerStats.delete(consumer.id);
      this.updatePerformanceMetrics();
    };
  }
  
  /**
   * Get current location
   */
  getCurrentLocation(): { lat: number; lng: number; accuracy: number; timestamp: number } | null {
    return this.lastPosition;
  }
  
  /**
   * Get current movement context
   */
  getMovementContext(): MovementContext | null {
    return this.movementContext;
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }
  
  /**
   * Get debug information for health dashboard
   */
  getDebugInfo(): BusDebugInfo {
    const consumers = Array.from(this.consumers.entries()).map(([id, consumer]) => {
      const stats = this.consumerStats.get(id) || { lastUpdate: 0, updateCount: 0, errors: 0 };
      return {
        id,
        type: consumer.type,
        priority: consumer.priority,
        lastUpdate: stats.lastUpdate,
        updateCount: stats.updateCount
      };
    });
    
    const isHealthy = 
      this.performanceMetrics.errorRate < 0.1 && // Less than 10% error rate
      this.performanceMetrics.averageLatency < 100 && // Less than 100ms average latency
      this.batchQueue.length < 25; // Batch queue not too large
    
    return {
      consumers,
      metrics: this.getPerformanceMetrics(),
      batchQueue: [...this.batchQueue],
      isHealthy
    };
  }
  
  /**
   * Force flush batch (for manual testing/debugging)
   */
  forceBatchFlush(): Promise<void> {
    return this.flushBatch();
  }
  
  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.performanceMetrics = {
      totalConsumers: this.consumers.size,
      activeConsumers: 0,
      batchSize: this.batchQueue.length,
      writeRate: 0,
      gpsAccuracy: this.lastPosition?.accuracy || 0,
      lastFlushTime: 0,
      contextDetectionAccuracy: 0.8,
      averageLatency: 0,
      errorRate: 0,
      spatialIndexingEnabled: false, // V2: Reset spatial indexing flag
      h3ComputationTime: 0 // V2: Reset H3 computation time
    };
    
    this.consumerStats.clear();
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
    }
    
    if (this.globalManagerSubscription) {
      this.globalManagerSubscription();
    }
    
    this.consumers.clear();
    this.consumerStats.clear();
    this.batchQueue = [];
  }
}

// Export singleton instance
export const locationBus = LocationBus.getInstance();