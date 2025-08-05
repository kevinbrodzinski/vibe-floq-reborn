/**
 * Location Bus Singleton - Central coordinator for all location operations
 * Integrates with GlobalLocationManager (useGeo foundation) for smart distribution
 * Implements smart batching, context-aware throttling, and performance monitoring
 * V2 ENHANCEMENT: Hybrid H3/Geohash spatial indexing for hosted Supabase
 */

import { globalLocationManager } from './GlobalLocationManager';
import { executeWithCircuitBreaker } from '@/lib/database/CircuitBreaker';
import { callFn } from '@/lib/callFn';

interface LocationBatch {
  ts: string;
  lat: number;
  lng: number;
  acc: number;
  consumerId: string;
}

interface LocationConsumer {
  id: string;
  callback: (position: GeolocationPosition) => void;
  errorCallback?: (error: GeolocationPositionError) => void;
  priority: 'high' | 'medium' | 'low';
  minDistanceM?: number;
  minTimeMs?: number;
}

interface MovementContext {
  speed: number; // mph
  state: 'stationary' | 'walking' | 'driving';
  confidence: number; // 0-1
}

interface PerformanceMetrics {
  totalUpdates: number;
  batchesFlushed: number;
  averageLatency: number;
  errorRate: number;
  lastFlushTime: number;
}

class LocationBus {
  private static instance: LocationBus | null = null;
  private consumers: Map<string, LocationConsumer> = new Map();
  private locationBatch: LocationBatch[] = [];
  private lastPosition: GeolocationPosition | null = null;
  private movementHistory: Array<{pos: GeolocationPosition, timestamp: number}> = [];
  private performanceMetrics: PerformanceMetrics = {
    totalUpdates: 0,
    batchesFlushed: 0,
    averageLatency: 0,
    errorRate: 0,
    lastFlushTime: 0
  };
  private flushInterval: number | null = null;
  private isActive = false;
  private unsubscribeGPS: (() => void) | null = null;

  static getInstance(): LocationBus {
    if (!LocationBus.instance) {
      LocationBus.instance = new LocationBus();
    }
    return LocationBus.instance;
  }

  private constructor() {}

  registerConsumer(consumer: LocationConsumer): () => void {
    this.consumers.set(consumer.id, consumer);
    
    if (!this.isActive) {
      this.startBus();
    }

    return () => {
      this.consumers.delete(consumer.id);
      if (this.consumers.size === 0) {
        this.stopBus();
      }
    };
  }

  private startBus() {
    this.isActive = true;
    
    this.unsubscribeGPS = globalLocationManager.subscribe(
      'location-bus',
      this.handleLocationUpdate.bind(this),
      this.handleLocationError.bind(this),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    this.flushInterval = window.setInterval(() => {
      this.flushLocationBatch();
    }, this.getAdaptiveFlushInterval());
  }

  private stopBus() {
    this.isActive = false;
    
    if (this.unsubscribeGPS) {
      this.unsubscribeGPS();
      this.unsubscribeGPS = null;
    }

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    this.flushLocationBatch();
  }

  private handleLocationUpdate(position: GeolocationPosition) {
    const now = Date.now();
    this.performanceMetrics.totalUpdates++;

    // Update movement history
    this.movementHistory.push({ pos: position, timestamp: now });
    if (this.movementHistory.length > 10) {
      this.movementHistory.shift();
    }

    // Distribute to consumers with filtering
    this.consumers.forEach((consumer) => {
      if (this.shouldUpdateConsumer(consumer, position)) {
        try {
          consumer.callback(position);
        } catch (error) {
          console.error(`LocationBus: Consumer ${consumer.id} callback failed:`, error);
        }
      }
    });

    // Add to batch for persistence
    this.locationBatch.push({
      ts: new Date(position.timestamp).toISOString(),
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      acc: position.coords.accuracy,
      consumerId: 'location-bus'
    });

    // Check if adaptive flush needed
    const context = this.detectMovementContext();
    if (context.state === 'driving' && this.locationBatch.length >= 10) {
      this.flushLocationBatch();
    }

    this.lastPosition = position;
  }

  private handleLocationError(error: GeolocationPositionError) {
    this.performanceMetrics.errorRate = 
      (this.performanceMetrics.errorRate * 0.9) + (1 * 0.1);

    this.consumers.forEach((consumer) => {
      if (consumer.errorCallback) {
        try {
          consumer.errorCallback(error);
        } catch (callbackError) {
          console.error(`LocationBus: Consumer ${consumer.id} error callback failed:`, callbackError);
        }
      }
    });
  }

  private shouldUpdateConsumer(consumer: LocationConsumer, position: GeolocationPosition): boolean {
    if (!this.lastPosition) return true;

    const timeDiff = position.timestamp - this.lastPosition.timestamp;
    if (consumer.minTimeMs && timeDiff < consumer.minTimeMs) {
      return false;
    }

    if (consumer.minDistanceM) {
      const distance = this.calculateDistance(
        this.lastPosition.coords.latitude,
        this.lastPosition.coords.longitude,
        position.coords.latitude,
        position.coords.longitude
      );
      if (distance < consumer.minDistanceM) {
        return false;
      }
    }

    return true;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private detectMovementContext(): MovementContext {
    if (this.movementHistory.length < 3) {
      return { speed: 0, state: 'stationary', confidence: 0.5 };
    }

    const recent = this.movementHistory.slice(-3);
    let totalDistance = 0;
    let totalTime = 0;

    for (let i = 1; i < recent.length; i++) {
      const distance = this.calculateDistance(
        recent[i-1].pos.coords.latitude,
        recent[i-1].pos.coords.longitude,
        recent[i].pos.coords.latitude,
        recent[i].pos.coords.longitude
      );
      totalDistance += distance;
      totalTime += recent[i].timestamp - recent[i-1].timestamp;
    }

    const speedMs = totalDistance / (totalTime / 1000);
    const speedMph = speedMs * 2.237;

    let state: 'stationary' | 'walking' | 'driving';
    let confidence: number;

    if (speedMph < 2) {
      state = 'stationary';
      confidence = 0.9;
    } else if (speedMph < 8) {
      state = 'walking';
      confidence = 0.8;
    } else {
      state = 'driving';
      confidence = 0.9;
    }

    return { speed: speedMph, state, confidence };
  }

  private getAdaptiveFlushInterval(): number {
    const context = this.detectMovementContext();
    switch (context.state) {
      case 'stationary': return 60000; // 1 minute
      case 'walking': return 30000;    // 30 seconds
      case 'driving': return 10000;    // 10 seconds
      default: return 30000;
    }
  }

  private async flushLocationBatch() {
    if (this.locationBatch.length === 0) return;

    const batch = [...this.locationBatch];
    this.locationBatch = [];
    
    const startTime = Date.now();

    try {
      await executeWithCircuitBreaker(
        () => callFn('record_locations', { batch }),
        'location-bus-batch',
        'medium'
      );

      this.performanceMetrics.batchesFlushed++;
      this.performanceMetrics.lastFlushTime = Date.now();
      
      const latency = Date.now() - startTime;
      this.performanceMetrics.averageLatency = 
        (this.performanceMetrics.averageLatency * 0.9) + (latency * 0.1);

    } catch (error) {
      console.error('LocationBus: Failed to flush batch:', error);
      this.performanceMetrics.errorRate = 
        (this.performanceMetrics.errorRate * 0.9) + (1 * 0.1);
      
      // Re-add failed batch with exponential backoff
      setTimeout(() => {
        this.locationBatch.unshift(...batch);
      }, Math.min(30000, 1000 * Math.pow(2, this.performanceMetrics.errorRate * 10)));
    }
  }

  getDebugInfo() {
    return {
      isActive: this.isActive,
      consumerCount: this.consumers.size,
      batchSize: this.locationBatch.length,
      movementContext: this.detectMovementContext(),
      metrics: this.performanceMetrics,
      lastPosition: this.lastPosition ? {
        lat: this.lastPosition.coords.latitude,
        lng: this.lastPosition.coords.longitude,
        timestamp: this.lastPosition.timestamp
      } : null
    };
  }

  forceFlush() {
    this.flushLocationBatch();
  }

  reset() {
    this.locationBatch = [];
    this.movementHistory = [];
    this.performanceMetrics = {
      totalUpdates: 0,
      batchesFlushed: 0,
      averageLatency: 0,
      errorRate: 0,
      lastFlushTime: 0
    };
  }
}

export const locationBus = LocationBus.getInstance();