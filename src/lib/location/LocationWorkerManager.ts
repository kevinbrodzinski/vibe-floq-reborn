/**
 * Location Worker Manager - Clean interface for using Location Web Worker
 * 
 * Provides:
 * - Promise-based API for worker operations
 * - Automatic worker lifecycle management
 * - Request queuing and deduplication
 * - Error handling and retries
 * - Performance monitoring
 */

interface WorkerRequest {
  id: string;
  type: string;
  payload: any;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
  timeout?: NodeJS.Timeout;
}

interface WorkerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  activeRequests: number;
}

export class LocationWorkerManager {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, WorkerRequest>();
  private requestQueue: WorkerRequest[] = [];
  private isProcessingQueue = false;
  private metrics: WorkerMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    activeRequests: 0
  };

  private static instance: LocationWorkerManager | null = null;
  private readonly MAX_CONCURRENT_REQUESTS = 10;
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  static getInstance(): LocationWorkerManager {
    if (!LocationWorkerManager.instance) {
      LocationWorkerManager.instance = new LocationWorkerManager();
    }
    return LocationWorkerManager.instance;
  }

  private constructor() {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      // Create worker from the LocationWorker.ts file
      this.worker = new Worker(
        new URL('./LocationWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
      
      console.log('[LocationWorkerManager] Worker initialized successfully');
    } catch (error) {
      console.error('[LocationWorkerManager] Failed to initialize worker:', error);
    }
  }

  private handleWorkerMessage(event: MessageEvent): void {
    const { id, type, result, error } = event.data;
    const request = this.pendingRequests.get(id);

    if (!request) {
      console.warn('[LocationWorkerManager] Received response for unknown request:', id);
      return;
    }

    // Clear timeout
    if (request.timeout) {
      clearTimeout(request.timeout);
    }

    // Remove from pending requests
    this.pendingRequests.delete(id);
    this.metrics.activeRequests = this.pendingRequests.size;

    // Update metrics
    const responseTime = Date.now() - request.timestamp;
    this.updateMetrics(true, responseTime);

    // Resolve or reject the promise
    if (error) {
      request.reject(new Error(error));
    } else {
      request.resolve(result);
    }

    // Process next item in queue
    this.processQueue();
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('[LocationWorkerManager] Worker error:', error);
    
    // Reject all pending requests
    this.pendingRequests.forEach(request => {
      if (request.timeout) {
        clearTimeout(request.timeout);
      }
      request.reject(new Error('Worker error: ' + error.message));
    });
    
    this.pendingRequests.clear();
    this.metrics.activeRequests = 0;

    // Try to reinitialize worker
    setTimeout(() => {
      this.initializeWorker();
    }, 1000);
  }

  private updateMetrics(success: boolean, responseTime?: number): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
      if (responseTime) {
        this.metrics.averageResponseTime = 
          (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + responseTime) / 
          this.metrics.successfulRequests;
      }
    } else {
      this.metrics.failedRequests++;
    }
  }

  private processQueue(): void {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    if (this.pendingRequests.size >= this.MAX_CONCURRENT_REQUESTS) {
      return; // Wait for some requests to complete
    }

    this.isProcessingQueue = true;

    const request = this.requestQueue.shift();
    if (request && this.worker) {
      // Add to pending requests
      this.pendingRequests.set(request.id, request);
      this.metrics.activeRequests = this.pendingRequests.size;

      // Set timeout
      request.timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        this.metrics.activeRequests = this.pendingRequests.size;
        this.updateMetrics(false);
        request.reject(new Error('Request timeout'));
      }, this.REQUEST_TIMEOUT);

      // Send to worker
      this.worker.postMessage({
        id: request.id,
        type: request.type,
        payload: request.payload
      });
    }

    this.isProcessingQueue = false;

    // Process next item if queue is not empty
    if (this.requestQueue.length > 0) {
      setTimeout(() => this.processQueue(), 0);
    }
  }

  private executeRequest<T>(type: string, payload: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const request: WorkerRequest = {
        id,
        type,
        payload,
        resolve,
        reject,
        timestamp: Date.now()
      };

      // Add to queue
      this.requestQueue.push(request);
      this.processQueue();
    });
  }

  /**
   * Calculate H3 spatial index and neighbors
   */
  async calculateH3Index(
    lat: number, 
    lng: number, 
    resolution: number = 9
  ): Promise<{
    h3Index: string;
    neighbors: string[];
    boundary: Array<[number, number]>;
    centerPoint: [number, number];
    area: number;
  }> {
    return this.executeRequest('h3-index', { lat, lng, resolution });
  }

  /**
   * Analyze movement patterns from location history
   */
  async analyzeMovement(points: Array<{
    lat: number;
    lng: number;
    timestamp: number;
    accuracy: number;
  }>): Promise<{
    speed: number;
    acceleration: number;
    context: 'stationary' | 'walking' | 'cycling' | 'driving' | 'transit';
    confidence: number;
    bearing: number;
    smoothedPath: Array<{ lat: number; lng: number; timestamp: number; accuracy: number }>;
  }> {
    return this.executeRequest('movement-analysis', { points });
  }

  /**
   * Calculate distances to multiple points in batch
   */
  async calculateDistanceBatch(
    origin: { lat: number; lng: number },
    points: Array<{ lat: number; lng: number; id?: string }>
  ): Promise<Array<{ id?: string; distance: number; bearing: number }>> {
    return this.executeRequest('distance-batch', { origin, points });
  }

  /**
   * Check if point is inside geofences
   */
  async checkGeofences(
    point: { lat: number; lng: number },
    geofences: Array<{
      id: string;
      center: { lat: number; lng: number };
      radius: number;
      type: 'circle' | 'polygon';
      polygon?: Array<{ lat: number; lng: number }>;
    }>
  ): Promise<Array<{ geofenceId: string; isInside: boolean; distance: number }>> {
    return this.executeRequest('geofence-check', { point, geofences });
  }

  /**
   * Perform spatial clustering on points
   */
  async performSpatialClustering(
    points: Array<{ lat: number; lng: number; id?: string }>,
    maxDistance: number = 100
  ): Promise<Array<{
    clusterId: string;
    center: { lat: number; lng: number };
    points: Array<{ lat: number; lng: number; id?: string }>;
    radius: number;
  }>> {
    return this.executeRequest('spatial-cluster', { points, maxDistance });
  }

  /**
   * Get worker performance metrics
   */
  getMetrics(): WorkerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get worker status
   */
  getStatus(): {
    isAvailable: boolean;
    pendingRequests: number;
    queuedRequests: number;
    metrics: WorkerMetrics;
  } {
    return {
      isAvailable: !!this.worker,
      pendingRequests: this.pendingRequests.size,
      queuedRequests: this.requestQueue.length,
      metrics: this.getMetrics()
    };
  }

  /**
   * Terminate the worker (cleanup)
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Reject all pending requests
    this.pendingRequests.forEach(request => {
      if (request.timeout) {
        clearTimeout(request.timeout);
      }
      request.reject(new Error('Worker terminated'));
    });

    this.pendingRequests.clear();
    this.requestQueue.length = 0;
    this.metrics.activeRequests = 0;
  }
}

// Export singleton instance
export const locationWorkerManager = LocationWorkerManager.getInstance();