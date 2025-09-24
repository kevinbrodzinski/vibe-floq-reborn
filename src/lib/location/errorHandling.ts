/**
 * Comprehensive error handling for location system
 * Handles GPS errors, network failures, and permission issues gracefully
 */

export type LocationErrorType = 
  | 'permission_denied'
  | 'position_unavailable' 
  | 'timeout'
  | 'network_error'
  | 'server_error'
  | 'encryption_error'
  | 'rate_limit_exceeded'
  | 'unknown';

export interface LocationError {
  type: LocationErrorType;
  message: string;
  timestamp: number;
  context?: any;
  recoverable: boolean;
  userMessage: string;
}

export class LocationErrorHandler {
  private static errorCounts = new Map<LocationErrorType, number>();
  private static lastErrors = new Map<LocationErrorType, number>();

  /**
   * Create standardized location error
   */
  static createError(
    type: LocationErrorType,
    message: string,
    context?: any,
    userMessage?: string
  ): LocationError {
    const timestamp = Date.now();
    
    // Track error frequency
    this.errorCounts.set(type, (this.errorCounts.get(type) || 0) + 1);
    this.lastErrors.set(type, timestamp);

    return {
      type,
      message,
      timestamp,
      context,
      recoverable: this.isRecoverable(type),
      userMessage: userMessage || this.getDefaultUserMessage(type),
    };
  }

  /**
   * Handle GeolocationPositionError
   */
  static fromGeolocationError(error: GeolocationPositionError): LocationError {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return this.createError(
          'permission_denied',
          'Location permission denied',
          { code: error.code, message: error.message },
          'Please allow location access in your browser settings'
        );
      
      case error.POSITION_UNAVAILABLE:
        return this.createError(
          'position_unavailable',
          'GPS position unavailable',
          { code: error.code, message: error.message },
          'GPS signal not available. Try moving to an open area.'
        );
      
      case error.TIMEOUT:
        return this.createError(
          'timeout',
          'Location request timed out',
          { code: error.code, message: error.message },
          'Location request took too long. Please try again.'
        );
      
      default:
        return this.createError(
          'unknown',
          error.message || 'Unknown location error',
          { code: error.code, message: error.message },
          'An unexpected location error occurred'
        );
    }
  }

  /**
   * Handle network/API errors
   */
  static fromNetworkError(error: any, operation: string): LocationError {
    if (error?.status === 429) {
      return this.createError(
        'rate_limit_exceeded',
        `Rate limit exceeded for ${operation}`,
        { error, operation },
        'Too many requests. Please wait a moment and try again.'
      );
    }

    if (error?.status >= 500) {
      return this.createError(
        'server_error',
        `Server error during ${operation}`,
        { error, operation },
        'Server is temporarily unavailable. Please try again.'
      );
    }

    return this.createError(
      'network_error',
      `Network error during ${operation}`,
      { error, operation },
      'Network connection issue. Please check your internet connection.'
    );
  }

  /**
   * Check if error type is recoverable
   */
  private static isRecoverable(type: LocationErrorType): boolean {
    const recoverableTypes: LocationErrorType[] = [
      'timeout',
      'network_error',
      'server_error',
      'position_unavailable',
    ];
    return recoverableTypes.includes(type);
  }

  /**
   * Get user-friendly error message
   */
  private static getDefaultUserMessage(type: LocationErrorType): string {
    const messages: Record<LocationErrorType, string> = {
      permission_denied: 'Location access is required for this feature',
      position_unavailable: 'GPS signal not available',
      timeout: 'Location request timed out',
      network_error: 'Network connection issue',
      server_error: 'Server temporarily unavailable',
      encryption_error: 'Security error occurred',
      rate_limit_exceeded: 'Too many requests, please wait',
      unknown: 'An unexpected error occurred',
    };
    return messages[type];
  }

  /**
   * Get error statistics for monitoring
   */
  static getErrorStats(): {
    errorCounts: Record<LocationErrorType, number>;
    recentErrors: Array<{ type: LocationErrorType; timestamp: number }>;
  } {
    const recentErrors = Array.from(this.lastErrors.entries())
      .filter(([, timestamp]) => Date.now() - timestamp < 60000) // Last minute
      .map(([type, timestamp]) => ({ type, timestamp }));

    return {
      errorCounts: Object.fromEntries(this.errorCounts) as Record<LocationErrorType, number>,
      recentErrors,
    };
  }

  /**
   * Check if we should show retry option
   */
  static shouldAllowRetry(error: LocationError): boolean {
    const errorCount = this.errorCounts.get(error.type) || 0;
    const lastError = this.lastErrors.get(error.type) || 0;
    const timeSinceLastError = Date.now() - lastError;

    // Don't allow retry if too many recent errors
    if (errorCount > 5 && timeSinceLastError < 30000) {
      return false;
    }

    return error.recoverable;
  }

  /**
   * Reset error counts (call after successful operation)
   */
  static resetErrorCount(type: LocationErrorType): void {
    this.errorCounts.set(type, 0);
  }

  /**
   * Clear old error data
   */
  static cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    for (const [type, timestamp] of this.lastErrors.entries()) {
      if (timestamp < oneHourAgo) {
        this.lastErrors.delete(type);
        this.errorCounts.delete(type);
      }
    }
  }
}

/**
 * Error boundary for location operations
 */
export function withLocationErrorHandler<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  operationName: string
) {
  return async (...args: T): Promise<R> => {
    try {
      const result = await operation(...args);
      // Reset error count on success
      LocationErrorHandler.resetErrorCount('network_error');
      LocationErrorHandler.resetErrorCount('server_error');
      return result;
    } catch (error) {
      if (error instanceof GeolocationPositionError) {
        throw LocationErrorHandler.fromGeolocationError(error);
      }
      
      throw LocationErrorHandler.fromNetworkError(error, operationName);
    }
  };
}