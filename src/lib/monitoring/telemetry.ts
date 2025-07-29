/**
 * Telemetry and monitoring utilities for Phase 5
 * Centralized logging, error tracking, and performance monitoring
 */

export interface TelemetryEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: string;
  profileId?: string;
  sessionId?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp?: string;
}

// Session management
let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  return sessionId;
}

/**
 * Log an event for monitoring and analytics
 */
export function logEvent(name: string, properties?: Record<string, any>) {
  const event: TelemetryEvent = {
    name,
    properties: {
      ...properties,
      sessionId: getSessionId(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    },
    timestamp: new Date().toISOString(),
  };

  // Console logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 [Telemetry] ${name}`, event.properties);
  }

  // In production, send to external monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Future: Send to Sentry, LogRocket, PostHog, etc.
    // Example for Sentry:
    // Sentry.addBreadcrumb({ message: name, data: properties });
    
    // Example for PostHog:
    // posthog.capture(name, properties);
  }

  // Store in browser for debugging
  if (typeof window !== 'undefined') {
    const events = JSON.parse(localStorage.getItem('telemetry_events') || '[]');
    events.push(event);
    // Keep only last 100 events
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }
    localStorage.setItem('telemetry_events', JSON.stringify(events));
  }
}

/**
 * Log performance metrics
 */
export function logPerformance(name: string, value: number, unit: PerformanceMetric['unit'] = 'ms') {
  const metric: PerformanceMetric = {
    name,
    value,
    unit,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === 'development') {
    console.log(`⚡ [Performance] ${name}: ${value}${unit}`);
  }

  logEvent('Performance Metric', metric);
}

/**
 * Track timing for async operations
 */
export function trackTiming<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const startTime = performance.now();
  
  return operation()
    .then(result => {
      const duration = performance.now() - startTime;
      logPerformance(name, Math.round(duration));
      return result;
    })
    .catch(error => {
      const duration = performance.now() - startTime;
      logPerformance(`${name}_failed`, Math.round(duration));
      logEvent('Operation Failed', {
        operation: name,
        error: error.message,
        duration: Math.round(duration),
      });
      throw error;
    });
}

/**
 * Log user actions for flow analysis
 */
export function logUserAction(action: string, context?: Record<string, any>) {
  logEvent('User Action', {
    action,
    ...context,
  });
}

/**
 * Log errors with context
 */
export function logError(error: Error, context?: Record<string, any>) {
  logEvent('Error Occurred', {
    error: error.message,
    stack: error.stack,
    name: error.name,
    ...context,
  });
}

/**
 * Log system health metrics
 */
export function logSystemHealth() {
  if (typeof window === 'undefined') return;

  const memory = (performance as any).memory;
  if (memory) {
    logEvent('System Health', {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      memoryUsagePercent: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
    });
  }

  // Network information
  const connection = (navigator as any).connection;
  if (connection) {
    logEvent('Network Info', {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
    });
  }
}

/**
 * Avatar upload specific tracking
 */
export const avatarTelemetry = {
  uploadStarted: (fileSize: number, fileType: string) => {
    logEvent('Avatar Upload Started', {
      fileSize,
      fileType,
      timestamp: Date.now(),
    });
  },

  uploadCompleted: (fileSize: number, duration: number, url: string) => {
    logEvent('Avatar Upload Completed', {
      fileSize,
      duration,
      url,
      uploadSpeed: Math.round(fileSize / (duration / 1000)), // bytes per second
    });
  },

  uploadFailed: (error: string, fileSize?: number, stage?: string) => {
    logEvent('Avatar Upload Failed', {
      error,
      fileSize,
      stage,
    });
  },

  queuedForOffline: (fileSize: number) => {
    logEvent('Avatar Queued Offline', {
      fileSize,
    });
  },

  offlineQueueFlushed: (count: number) => {
    logEvent('Offline Queue Flushed', {
      queuedCount: count,
    });
  },
};

/**
 * Onboarding flow tracking
 */
export const onboardingTelemetry = {
  stepStarted: (step: string) => {
    logEvent('Onboarding Step Started', { step });
  },

  stepCompleted: (step: string, duration?: number) => {
    logEvent('Onboarding Step Completed', { step, duration });
  },

  stepSkipped: (step: string, reason?: string) => {
    logEvent('Onboarding Step Skipped', { step, reason });
  },

  flowCompleted: (totalDuration: number, stepsCompleted: string[]) => {
    logEvent('Onboarding Flow Completed', {
      totalDuration,
      stepsCompleted,
      stepCount: stepsCompleted.length,
    });
  },

  flowAbandoned: (lastStep: string, reason?: string) => {
    logEvent('Onboarding Flow Abandoned', {
      lastStep,
      reason,
    });
  },
};

/**
 * Initialize telemetry system
 */
export function initTelemetry() {
  logEvent('Telemetry Initialized', {
    timestamp: Date.now(),
    sessionId: getSessionId(),
  });

  // Log system health periodically
  if (typeof window !== 'undefined') {
    setInterval(logSystemHealth, 60000); // Every minute
  }
}
