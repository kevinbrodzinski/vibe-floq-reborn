export function edgeLog(event: string, props: Record<string, unknown> = {}) {
  const timestamp = new Date().toISOString();

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[${timestamp}] ${event}:`, props);
  }

  try {
    fetch('/edge-logger', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event, timestamp, ...props }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

/**
 * Privacy gate observability helper for rollout metrics
 */
export function logPrivacyGate(
  event: 'ok' | 'degrade' | 'suppress' | 'bypass' | 'error', 
  ctx: { 
    feature: string; 
    envelope?: string; 
    mode?: string; 
    receiptId?: string; 
    reason?: string;
    error?: string;
  }
) {
  edgeLog('privacy_gate', { event, ...ctx });
}