/**
 * Enhanced Database Circuit Breaker - Prevents database overload with priority queuing
 * Integrates with location system for intelligent throttling and monitoring
 */

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
  maxConcurrentWrites: number;
  maxQueueSize: number;
  writeRateLimit: number; // writes per second
  priorityLevels: {
    high: { weight: number; maxRetries: number };
    medium: { weight: number; maxRetries: number };
    low: { weight: number; maxRetries: number };
  };
}

interface WriteOperation {
  id: string;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
  operation: () => Promise<any>;
  retryCount: number;
  maxRetries: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  metadata?: {
    component?: string;
    operationType?: string;
    batchSize?: number;
  };
}

interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalOperations: number;
  averageResponseTime: number;
  writeRate: number; // operations per second
  queueSize: number;
  activeWrites: number;
  priorityDistribution: { high: number; medium: number; low: number };
  lastStateChange: number;
  uptimePercentage: number;
  errorsByType: Map<string, number>;
}

enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Blocking requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

class DatabaseCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalOperations = 0;
  private lastFailureTime = 0;
  private lastStateChange = Date.now();
  private nextAttemptTime = 0;
  private activeWrites = 0;
  private writeQueue: WriteOperation[] = [];
  private recentWrites: Array<{ timestamp: number; duration: number; success: boolean }> = [];
  private errorsByType: Map<string, number> = new Map();
  private responseTimeHistory: number[] = [];
  
  private readonly options: CircuitBreakerOptions;
  private processingInterval: number | null = null;
  private metricsInterval: number | null = null;
  
  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringWindow: 300000, // 5 minutes
      maxConcurrentWrites: 8, // Reduced from 10 based on performance analysis
      maxQueueSize: 100,
      writeRateLimit: 2, // 2 writes per second maximum
      priorityLevels: {
        high: { weight: 3, maxRetries: 3 },
        medium: { weight: 2, maxRetries: 2 },
        low: { weight: 1, maxRetries: 1 }
      },
      ...options
    };
    
    this.startProcessingQueue();
    this.startMetricsCollection();
  }
  
  private startProcessingQueue() {
    // Process queue every 500ms for smooth operation
    this.processingInterval = window.setInterval(() => {
      this.processQueue();
    }, 500);
  }
  
  private startMetricsCollection() {
    // Clean up old metrics every 30 seconds
    this.metricsInterval = window.setInterval(() => {
      this.cleanupOldMetrics();
    }, 30000);
  }
  
  private cleanupOldMetrics() {
    const cutoff = Date.now() - this.options.monitoringWindow;
    this.recentWrites = this.recentWrites.filter(write => write.timestamp > cutoff);
    
    // Keep only last 100 response times for average calculation
    if (this.responseTimeHistory.length > 100) {
      this.responseTimeHistory = this.responseTimeHistory.slice(-100);
    }
  }
  
  private getWriteRate(): number {
    this.cleanupOldMetrics();
    const windowSeconds = this.options.monitoringWindow / 1000;
    return this.recentWrites.length / windowSeconds;
  }
  
  private shouldThrottle(): boolean {
    const writeRate = this.getWriteRate();
    const isOverloaded = this.activeWrites >= this.options.maxConcurrentWrites;
    const isHighRate = writeRate > this.options.writeRateLimit;
    const isQueueFull = this.writeQueue.length >= this.options.maxQueueSize;
    
    return isOverloaded || isHighRate || isQueueFull;
  }
  
  private transitionToOpen() {
    this.state = CircuitState.OPEN;
    this.lastStateChange = Date.now();
    this.nextAttemptTime = Date.now() + this.options.resetTimeout;
    console.warn('[CircuitBreaker] Circuit opened - blocking database writes', {
      failureCount: this.failureCount,
      activeWrites: this.activeWrites,
      queueSize: this.writeQueue.length
    });
  }
  
  private transitionToHalfOpen() {
    this.state = CircuitState.HALF_OPEN;
    this.lastStateChange = Date.now();
    console.log('[CircuitBreaker] Circuit half-open - testing database recovery');
  }
  
  private transitionToClosed() {
    this.state = CircuitState.CLOSED;
    this.lastStateChange = Date.now();
    this.failureCount = 0;
    console.log('[CircuitBreaker] Circuit closed - normal operation resumed');
  }
  
  private updateState() {
    const now = Date.now();
    
    switch (this.state) {
      case CircuitState.CLOSED:
        if (this.failureCount >= this.options.failureThreshold) {
          this.transitionToOpen();
        }
        break;
        
      case CircuitState.OPEN:
        if (now >= this.nextAttemptTime) {
          this.transitionToHalfOpen();
        }
        break;
        
      case CircuitState.HALF_OPEN:
        // Allow a few test operations, then decide based on results
        if (this.successCount >= 3) {
          this.transitionToClosed();
        } else if (this.failureCount > 0) {
          this.transitionToOpen();
        }
        break;
    }
  }
  
  private processQueue() {
    if (this.writeQueue.length === 0) return;
    
    this.updateState();
    
    // Don't process if circuit is open (except for high priority in half-open)
    if (this.state === CircuitState.OPEN) {
      this.rejectLowPriorityOperations();
      return;
    }
    
    // Sort queue by priority and timestamp
    this.writeQueue.sort((a, b) => {
      const priorityDiff = this.options.priorityLevels[b.priority].weight - 
                          this.options.priorityLevels[a.priority].weight;
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp; // FIFO within same priority
    });
    
    // Process operations up to concurrent limit
    const availableSlots = this.options.maxConcurrentWrites - this.activeWrites;
    const operationsToProcess = this.writeQueue.splice(0, Math.min(availableSlots, 3));
    
    for (const operation of operationsToProcess) {
      this.executeOperation(operation);
    }
  }
  
  private async executeOperation(operation: WriteOperation) {
    this.activeWrites++;
    const startTime = performance.now();
    
    try {
      const result = await operation.operation();
      
      const duration = performance.now() - startTime;
      this.recordSuccess(duration);
      this.responseTimeHistory.push(duration);
      
      operation.resolve(result);
      
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordFailure(error, operation.metadata?.operationType);
      
      // Retry logic based on priority
      if (operation.retryCount < operation.maxRetries) {
        operation.retryCount++;
        operation.timestamp = Date.now() + (operation.retryCount * 1000); // Exponential backoff
        this.writeQueue.push(operation);
      } else {
        operation.reject(error);
      }
      
    } finally {
      this.activeWrites--;
    }
  }
  
  private recordSuccess(duration: number) {
    this.successCount++;
    this.totalOperations++;
    this.recentWrites.push({
      timestamp: Date.now(),
      duration,
      success: true
    });
    
    // Reset failure count on successful operation in half-open state
    if (this.state === CircuitState.HALF_OPEN) {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }
  
  private recordFailure(error: any, operationType?: string) {
    this.failureCount++;
    this.totalOperations++;
    this.lastFailureTime = Date.now();
    
    // Track error types
    const errorType = operationType || 'unknown';
    this.errorsByType.set(errorType, (this.errorsByType.get(errorType) || 0) + 1);
    
    this.recentWrites.push({
      timestamp: Date.now(),
      duration: 0,
      success: false
    });
  }
  
  private rejectLowPriorityOperations() {
    // Reject low and medium priority operations when circuit is open
    const toReject = this.writeQueue.filter(op => op.priority !== 'high');
    this.writeQueue = this.writeQueue.filter(op => op.priority === 'high');
    
    toReject.forEach(operation => {
      operation.reject(new Error('Circuit breaker is OPEN - operation rejected'));
    });
  }
  
  /**
   * Execute a database operation with circuit breaker protection
   */
  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium',
    metadata?: {
      component?: string;
      operationType?: string;
      batchSize?: number;
    }
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Immediate rejection if circuit is open and not high priority
      if (this.state === CircuitState.OPEN && priority !== 'high') {
        reject(new Error('Circuit breaker is OPEN - operation rejected'));
        return;
      }
      
      // Check throttling conditions
      if (this.shouldThrottle() && priority === 'low') {
        reject(new Error('System overloaded - low priority operation rejected'));
        return;
      }
      
      // Queue size limit check
      if (this.writeQueue.length >= this.options.maxQueueSize) {
        // Remove oldest low priority operation to make room
        const lowPriorityIndex = this.writeQueue.findIndex(op => op.priority === 'low');
        if (lowPriorityIndex !== -1) {
          const removed = this.writeQueue.splice(lowPriorityIndex, 1)[0];
          removed.reject(new Error('Queue full - operation evicted'));
        } else {
          reject(new Error('Queue full - operation rejected'));
          return;
        }
      }
      
      const writeOperation: WriteOperation = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        priority,
        operation,
        retryCount: 0,
        maxRetries: this.options.priorityLevels[priority].maxRetries,
        resolve,
        reject,
        metadata
      };
      
      this.writeQueue.push(writeOperation);
    });
  }
  
  /**
   * Get current circuit breaker status
   */
  getStatus(): CircuitBreakerMetrics {
    const now = Date.now();
    const uptime = now - this.lastStateChange;
    const totalTime = now - (this.lastStateChange - uptime);
    const uptimePercentage = this.state === CircuitState.CLOSED ? 
      (uptime / Math.max(totalTime, 1)) * 100 : 0;
    
    const avgResponseTime = this.responseTimeHistory.length > 0 ?
      this.responseTimeHistory.reduce((sum, time) => sum + time, 0) / this.responseTimeHistory.length : 0;
    
    const priorityDistribution = this.writeQueue.reduce(
      (acc, op) => {
        acc[op.priority]++;
        return acc;
      },
      { high: 0, medium: 0, low: 0 }
    );
    
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalOperations: this.totalOperations,
      averageResponseTime: avgResponseTime,
      writeRate: this.getWriteRate(),
      queueSize: this.writeQueue.length,
      activeWrites: this.activeWrites,
      priorityDistribution,
      lastStateChange: this.lastStateChange,
      uptimePercentage,
      errorsByType: this.errorsByType
    };
  }
  
  /**
   * Get detailed debug information
   */
  getDebugInfo() {
    const status = this.getStatus();
    const recentOperations = this.writeQueue.slice(0, 10).map(op => ({
      id: op.id,
      priority: op.priority,
      retryCount: op.retryCount,
      age: Date.now() - op.timestamp,
      component: op.metadata?.component,
      operationType: op.metadata?.operationType
    }));
    
    return {
      ...status,
      recentOperations,
      configuration: this.options,
      recentWriteHistory: this.recentWrites.slice(-20),
      nextAttemptTime: this.nextAttemptTime,
      isThrottling: this.shouldThrottle()
    };
  }
  
  /**
   * Manual circuit breaker control
   */
  forceOpen(): void {
    this.transitionToOpen();
  }
  
  forceClose(): void {
    this.transitionToClosed();
  }
  
  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.totalOperations = 0;
    this.lastFailureTime = 0;
    this.errorsByType.clear();
    this.responseTimeHistory = [];
    this.recentWrites = [];
    this.transitionToClosed();
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    // Reject all pending operations
    this.writeQueue.forEach(operation => {
      operation.reject(new Error('Circuit breaker destroyed'));
    });
    
    this.writeQueue = [];
  }
}

// Export singleton instance
export const databaseCircuitBreaker = new DatabaseCircuitBreaker();

/**
 * Convenience function for executing operations with circuit breaker
 */
export async function executeWithCircuitBreaker<T>(
  operation: () => Promise<T>,
  priority: 'high' | 'medium' | 'low' = 'medium',
  metadata?: {
    component?: string;
    operationType?: string;
    batchSize?: number;
  }
): Promise<T> {
  return databaseCircuitBreaker.executeWithCircuitBreaker(operation, priority, metadata);
}