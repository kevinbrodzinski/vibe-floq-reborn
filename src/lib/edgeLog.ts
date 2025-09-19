// Enhanced edge logging with receipt threading and privacy compliance

export function edgeLog(event: string, props: Record<string, unknown> = {}) {
  try {
    const logData = {
      event,
      timestamp: Date.now(),
      ...props
    };

    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Field] ${event}:`, logData);
    }

    // Production logging - send to edge logger endpoint
    if (typeof window !== 'undefined') {
      fetch('/edge-logger', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(logData),
        keepalive: true,
      }).catch(() => {
        // Silent fail - logging shouldn't break user experience
      });
    }
  } catch {
    // Silent fail - logging shouldn't break user experience
  }
}