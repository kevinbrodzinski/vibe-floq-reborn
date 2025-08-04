/**
 * Location Bus Singleton - Central coordinator for all location operations
 * Implements smart batching, context-aware throttling, and performance monitoring
 * Based on architectural insights for preventing GPS conflicts and cascade effects
 */

import { globalLocationManager } from './GlobalLocationManager';
import { executeWithCircuitBreaker } from '@/lib/database/CircuitBreaker';
import { supabase } from '@/integrations/supabase/client';
import { calculateDistance } from '@/lib/location/standardGeo';
import { callFn } from '@/lib/callFn';

interface LocationConsumer {
  id: string;
  type: 'tracking' | 'presence' | 'display' | 'analytics';
  priority: 'high' | 'medium' | 'low';
  callback: (position: GeolocationPosition) => void;
  options?: {
    minDistance?: number;
    minTime?: number;
    enableBatching?: boolean;
  };
}

interface LocationBatch {
  ts: string;
  lat: number;
  lng: number;
  acc: number;
  context?: MovementContext;
}

interface MovementContext {
  isStationary: boolean;
  isWalking: boolean;
  speed: number; // m/s
  heading?: number;
}

interface PerformanceMetrics {
  totalConsumers: number;
  activeConsumers: number;
  batchSize: number;
  writeRate: number; // writes per minute
  gpsAccuracy: number;
  lastFlushTime: number;
  contextDetectionAccuracy: number;
}

class LocationBus {
  private static instance: LocationBus | null = null;
  private consumers: Map<string, LocationConsumer> = new Map();
  private locationBatch: LocationBatch[] = [];
  private lastPosition: GeolocationPosition | null = null;
  private lastFlushTime = 0;
  private movementHistory: Array<{pos: GeolocationPosition, timestamp: number}> = [];
  private performanceMetrics: PerformanceMetrics;
  private flushInterval: number | null = null;
  private isActive = false;

  // Adaptive thresholds based on movement context
  private readonly STATIONARY_FLUSH_INTERVAL = 60000; // 1 minute when stationary
  private readonly WALKING_FLUSH_INTERVAL = 30000;    // 30 seconds when walking
  private readonly DRIVING_FLUSH_INTERVAL = 15000;    // 15 seconds when driving
  private readonly MAX_BATCH_SIZE = 50;               // Maximum points per batch
  private readonly MOVEMENT_HISTORY_SIZE = 10;        // Keep last 10 positions for context

  static getInstance(): LocationBus {
    if (!LocationBus.instance) {
      LocationBus.instance = new LocationBus();
    }
    return LocationBus.instance;
  }

  private constructor() {
    this.performanceMetrics = {
      totalConsumers: 0,
      activeConsumers: 0,
      batchSize: 0,
      writeRate: 0,
      gpsAccuracy: 0,
      lastFlushTime: 0,
      contextDetectionAccuracy: 0
    };
  }

  /**
   * Register a location consumer with the bus
   */
  registerConsumer(consumer: LocationConsumer): () => void {
    console.log(`[LocationBus] Registering consumer: ${consumer.id} (${consumer.type})`);
    
    this.consumers.set(consumer.id, consumer);
    this.updateMetrics();

    // Start the bus if this is the first consumer
    if (this.consumers.size === 1) {
      this.startBus();
    }

    // Return unregister function
    return () => {
      console.log(`[LocationBus] Unregistering consumer: ${consumer.id}`);
      this.consumers.delete(consumer.id);
      this.updateMetrics();

      // Stop the bus if no more consumers
      if (this.consumers.size === 0) {
        this.stopBus();
      }
    };
  }

  /**
   * Start the location bus system
   */
  private startBus() {
    if (this.isActive) return;

    console.log('[LocationBus] Starting location bus system');
    this.isActive = true;

    // Subscribe to global location manager
    globalLocationManager.subscribe(
      'location-bus',
      this.handleLocationUpdate.bind(this),
      this.handleLocationError.bind(this),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    );

    // Start adaptive flushing
    this.startAdaptiveFlush();
  }

  /**
   * Stop the location bus system
   */
  private stopBus() {
    if (!this.isActive) return;

    console.log('[LocationBus] Stopping location bus system');
    this.isActive = false;

    // Final flush before stopping
    this.flushLocationBatch();

    // Clear intervals
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Clear state
    this.locationBatch = [];
    this.movementHistory = [];
    this.lastPosition = null;
  }

  /**
   * Handle location updates from global manager
   */
  private handleLocationUpdate(position: GeolocationPosition) {
    this.lastPosition = position;
    this.updateMovementHistory(position);
    
    const context = this.detectMovementContext();
    
    // Update performance metrics
    this.performanceMetrics.gpsAccuracy = position.coords.accuracy;

    // Distribute to consumers with filtering
    this.distributeToConsumers(position);

    // Add to batch if any consumers need tracking
    if (this.hasTrackingConsumers()) {
      this.addToBatch(position, context);
    }

    // Adaptive flushing based on context
    this.checkAdaptiveFlush(context);
  }

  /**
   * Handle location errors
   */
  private handleLocationError(error: GeolocationPositionError) {
    console.error('[LocationBus] Location error:', error);
    
    // Notify consumers of error
    this.consumers.forEach(consumer => {
      // Could add error callback to consumer interface if needed
    });
  }

  /**
   * Detect movement context from position history
   */
  private detectMovementContext(): MovementContext {
    if (this.movementHistory.length < 3) {
      return { isStationary: true, isWalking: false, speed: 0 };
    }

    const recent = this.movementHistory.slice(-3);
    const distances = [];
    const timeDiffs = [];

    for (let i = 1; i < recent.length; i++) {
      const distance = calculateDistance(
        { lat: recent[i-1].pos.coords.latitude, lng: recent[i-1].pos.coords.longitude },
        { lat: recent[i].pos.coords.latitude, lng: recent[i].pos.coords.longitude }
      );
      const timeDiff = (recent[i].timestamp - recent[i-1].timestamp) / 1000; // seconds
      
      distances.push(distance);
      timeDiffs.push(timeDiff);
    }

    // Calculate average speed
    const totalDistance = distances.reduce((sum, d) => sum + d, 0);
    const totalTime = timeDiffs.reduce((sum, t) => sum + t, 0);
    const avgSpeed = totalTime > 0 ? totalDistance / totalTime : 0; // m/s

    // Context detection thresholds
    const isStationary = avgSpeed < 0.5; // < 0.5 m/s (1.8 km/h)
    const isWalking = avgSpeed >= 0.5 && avgSpeed < 2.5; // 0.5-2.5 m/s (1.8-9 km/h)
    const isDriving = avgSpeed >= 2.5; // > 2.5 m/s (9 km/h)

    return {
      isStationary,
      isWalking,
      speed: avgSpeed,
      heading: this.calculateHeading()
    };
  }

  /**
   * Calculate movement heading from recent positions
   */
  private calculateHeading(): number | undefined {
    if (this.movementHistory.length < 2) return undefined;

    const recent = this.movementHistory.slice(-2);
    const from = recent[0].pos.coords;
    const to = recent[1].pos.coords;

    const dLng = (to.longitude - from.longitude) * Math.PI / 180;
    const lat1 = from.latitude * Math.PI / 180;
    const lat2 = to.latitude * Math.PI / 180;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    let heading = Math.atan2(y, x) * 180 / Math.PI;
    return (heading + 360) % 360; // Normalize to 0-360
  }

  /**
   * Update movement history with new position
   */
  private updateMovementHistory(position: GeolocationPosition) {
    this.movementHistory.push({
      pos: position,
      timestamp: Date.now()
    });

    // Keep only recent history
    if (this.movementHistory.length > this.MOVEMENT_HISTORY_SIZE) {
      this.movementHistory = this.movementHistory.slice(-this.MOVEMENT_HISTORY_SIZE);
    }
  }

  /**
   * Distribute location update to registered consumers
   */
  private distributeToConsumers(position: GeolocationPosition) {
    let activeCount = 0;

    this.consumers.forEach(consumer => {
      // Apply consumer-specific filtering
      if (this.shouldNotifyConsumer(consumer, position)) {
        try {
          consumer.callback(position);
          activeCount++;
        } catch (error) {
          console.error(`[LocationBus] Consumer ${consumer.id} callback failed:`, error);
        }
      }
    });

    this.performanceMetrics.activeConsumers = activeCount;
  }

  /**
   * Check if consumer should be notified based on their options
   */
  private shouldNotifyConsumer(consumer: LocationConsumer, position: GeolocationPosition): boolean {
    if (!consumer.options) return true;

    // Distance filtering
    if (consumer.options.minDistance && this.lastPosition) {
      const distance = calculateDistance(
        { lat: this.lastPosition.coords.latitude, lng: this.lastPosition.coords.longitude },
        { lat: position.coords.latitude, lng: position.coords.longitude }
      );
      
      if (distance < consumer.options.minDistance) {
        return false;
      }
    }

    // Time filtering
    if (consumer.options.minTime) {
      const timeDiff = Date.now() - (this.lastPosition?.timestamp || 0);
      if (timeDiff < consumer.options.minTime) {
        return false;
      }
    }

    return true;
  }

  /**
   * Add position to batch for server recording
   */
  private addToBatch(position: GeolocationPosition, context: MovementContext) {
    const batchItem: LocationBatch = {
      ts: new Date().toISOString(),
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      acc: position.coords.accuracy,
      context
    };

    this.locationBatch.push(batchItem);
    this.performanceMetrics.batchSize = this.locationBatch.length;

    // Force flush if batch gets too large
    if (this.locationBatch.length >= this.MAX_BATCH_SIZE) {
      console.log('[LocationBus] Batch size limit reached, forcing flush');
      this.flushLocationBatch();
    }
  }

  /**
   * Check if any consumers need location tracking
   */
  private hasTrackingConsumers(): boolean {
    return Array.from(this.consumers.values()).some(c => c.type === 'tracking');
  }

  /**
   * Start adaptive flushing based on movement context
   */
  private startAdaptiveFlush() {
    // Clear existing interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Start with default interval, will be adjusted based on context
    this.flushInterval = setInterval(() => {
      this.flushLocationBatch();
    }, this.WALKING_FLUSH_INTERVAL);
  }

  /**
   * Check if we should flush based on movement context
   */
  private checkAdaptiveFlush(context: MovementContext) {
    const now = Date.now();
    let flushInterval: number;

    // Adaptive interval based on movement
    if (context.isStationary) {
      flushInterval = this.STATIONARY_FLUSH_INTERVAL;
    } else if (context.isWalking) {
      flushInterval = this.WALKING_FLUSH_INTERVAL;
    } else {
      flushInterval = this.DRIVING_FLUSH_INTERVAL; // Driving or fast movement
    }

    // Check if it's time to flush
    if (now - this.lastFlushTime >= flushInterval) {
      this.flushLocationBatch();
    }

    // Update flush interval if needed
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = setInterval(() => {
        this.flushLocationBatch();
      }, flushInterval);
    }
  }

  /**
   * Flush location batch to server
   */
  private async flushLocationBatch() {
    if (this.locationBatch.length === 0) return;

    const batch = this.locationBatch.splice(0, this.locationBatch.length);
    this.lastFlushTime = Date.now();
    this.performanceMetrics.lastFlushTime = this.lastFlushTime;
    this.performanceMetrics.batchSize = 0;

    // Update write rate (writes per minute)
    const writeRate = batch.length / ((Date.now() - (this.performanceMetrics.lastFlushTime || Date.now())) / 60000);
    this.performanceMetrics.writeRate = writeRate;

    try {
      await executeWithCircuitBreaker(
        () => callFn('record_locations', { batch }),
        'location-bus-batch',
        'medium'
      );

      console.log(`[LocationBus] Flushed ${batch.length} location points`);
    } catch (error) {
      console.error('[LocationBus] Failed to flush location batch:', error);
      
      // Re-add failed items to front of batch (but limit size)
      if (this.locationBatch.length < this.MAX_BATCH_SIZE) {
        this.locationBatch.unshift(...batch.slice(-25)); // Keep only last 25 failed items
      }
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics() {
    this.performanceMetrics.totalConsumers = this.consumers.size;
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      isActive: this.isActive,
      consumers: Array.from(this.consumers.entries()).map(([id, consumer]) => ({
        id,
        type: consumer.type,
        priority: consumer.priority
      })),
      batchSize: this.locationBatch.length,
      movementHistory: this.movementHistory.length,
      lastPosition: this.lastPosition ? {
        lat: this.lastPosition.coords.latitude,
        lng: this.lastPosition.coords.longitude,
        accuracy: this.lastPosition.coords.accuracy,
        timestamp: this.lastPosition.timestamp
      } : null,
      metrics: this.performanceMetrics
    };
  }

  /**
   * Force flush for testing/debugging
   */
  forceFlush() {
    this.flushLocationBatch();
  }

  /**
   * Reset the bus state
   */
  reset() {
    this.stopBus();
    this.consumers.clear();
    this.locationBatch = [];
    this.movementHistory = [];
    this.lastPosition = null;
    this.performanceMetrics = {
      totalConsumers: 0,
      activeConsumers: 0,
      batchSize: 0,
      writeRate: 0,
      gpsAccuracy: 0,
      lastFlushTime: 0,
      contextDetectionAccuracy: 0
    };
  }
}

export const locationBus = LocationBus.getInstance();