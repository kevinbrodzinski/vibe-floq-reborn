/**
 * Database Circuit Breaker - Prevents database overload by throttling writes
 * when the system is under stress
 */

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
  maxConcurrentWrites: number;
}

interface WriteOperation {
  id: string;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
}

enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Blocking requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

class DatabaseCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  private activeWrites = 0;
  private writeQueue: WriteOperation[] = [];
  private recentWrites: number[] = [];
  
  private readonly options: CircuitBreakerOptions;
  
  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringWindow: 300000, // 5 minutes
      maxConcurrentWrites: 10,
      ...options
    };
  }
  
  private cleanupOldWrites() {
    const cutoff = Date.now() - this.options.monitoringWindow;
    this.recentWrites = this.recentWrites.filter(time => time > cutoff);
  }
  
  private getWriteRate(): number {
    this.cleanupOldWrites();
    return this.recentWrites.length / (this.options.monitoringWindow / 1000); // writes per second
  }
  
  private shouldThrottle(): boolean {
    const writeRate = this.getWriteRate();
    const isOverloaded = this.activeWrites >= this.options.maxConcurrentWrites;
    const isHighRate = writeRate > 2; // More than 2 writes per second
    
    return isOverloaded || isHighRate;
  }
  
  private transitionToOpen() {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.options.resetTimeout;
    console.warn('[CircuitBreaker] Circuit opened - blocking database writes');
  }
  
  private transitionToHalfOpen() {
    this.state = CircuitState.HALF_OPEN;
    console.log('[CircuitBreaker] Circuit half-open - testing database recovery');
  }
  
  private transitionToClosed() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    console.log('[CircuitBreaker] Circuit closed - normal operation resumed');
  }
  
  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.options.failureThreshold) {
      this.transitionToOpen();
    }
  }
  
  private recordSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToClosed();
    }
    // Reset failure count on success
    this.failureCount = Math.max(0, this.failureCount - 1);
  }
  
  /**
   * Execute a database write operation with circuit breaker protection
   */
  async executeWrite<T>(
    operation: () => Promise<T>,
    operationId: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    const now = Date.now();
    
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (now < this.nextAttemptTime) {
        if (priority === 'high') {
          // Allow high priority operations even when circuit is open
          console.warn(`[CircuitBreaker] Allowing high priority operation: ${operationId}`);
        } else {
          throw new Error(`Circuit breaker is OPEN. Database writes are temporarily blocked. Try again later.`);
        }
      } else {
        this.transitionToHalfOpen();
      }
    }
    
    // Check for throttling
    if (this.shouldThrottle() && priority !== 'high') {
      console.warn(`[CircuitBreaker] Throttling operation: ${operationId}`);
      throw new Error('Database is under heavy load. Please try again later.');
    }
    
    // Track active write
    this.activeWrites++;
    this.recentWrites.push(now);
    
    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    } finally {
      this.activeWrites--;
    }
  }
  
  /**
   * Check if writes are currently allowed
   */
  canWrite(priority: 'high' | 'medium' | 'low' = 'medium'): boolean {
    if (priority === 'high') return true;
    
    const now = Date.now();
    if (this.state === CircuitState.OPEN && now < this.nextAttemptTime) {
      return false;
    }
    
    return !this.shouldThrottle();
  }
  
  /**
   * Get current circuit breaker status
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      activeWrites: this.activeWrites,
      writeRate: this.getWriteRate(),
      canWrite: this.canWrite(),
      nextAttemptTime: this.state === CircuitState.OPEN ? this.nextAttemptTime : null,
      isThrottling: this.shouldThrottle()
    };
  }
  
  /**
   * Force reset the circuit breaker (for testing/admin use)
   */
  reset() {
    this.transitionToClosed();
    this.activeWrites = 0;
    this.recentWrites = [];
    console.log('[CircuitBreaker] Circuit breaker manually reset');
  }
}

// Global instance for database operations
export const databaseCircuitBreaker = new DatabaseCircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  monitoringWindow: 300000, // 5 minutes
  maxConcurrentWrites: 8 // Reduced from default to be more conservative
});

/**
 * Wrapper function for database writes with circuit breaker protection
 */
export async function executeWithCircuitBreaker<T>(
  operation: () => Promise<T>,
  operationId: string,
  priority: 'high' | 'medium' | 'low' = 'medium'
): Promise<T> {
  return databaseCircuitBreaker.executeWrite(operation, operationId, priority);
}