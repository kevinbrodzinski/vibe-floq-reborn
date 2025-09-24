export interface BaseRealtimePayload<T = Record<string, unknown>> {
  eventType: string;
  schema: string;
  table: string;
  commit_timestamp?: string;
  new: T | null;
  old: T | null;
}

let errorCount = 0;
const MAX_ERRORS_PER_SESSION = 5;

/**
 * Validates a realtime payload to ensure it matches the expected structure.
 */
export const validateRealtimePayload = <T extends Record<string, unknown> = Record<string, unknown>>(
  payload: unknown
): payload is BaseRealtimePayload<T> => {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const p = payload as Record<string, unknown>;
  
  // Check required fields
  const hasRequiredFields = 
    'eventType' in p && typeof p.eventType === 'string' &&
    'schema' in p && typeof p.schema === 'string' &&
    'table' in p && typeof p.table === 'string' &&
    'new' in p &&
    'old' in p;

  return hasRequiredFields;
};

/**
 * Creates a safe realtime handler that validates payloads before invoking the callback.
 */
export const createSafeRealtimeHandler =
  <T extends Record<string, unknown> = Record<string, unknown>>(
    handler: (p: BaseRealtimePayload<T>) => void,
    onError?: (error: Error, payload: unknown) => void
  ) =>
  (raw: unknown) => {
    if (!validateRealtimePayload<T>(raw)) {
      errorCount++;
      const error = new Error('Invalid realtime payload structure');
      
      // Throttle error logging in production
      if (import.meta.env.DEV || errorCount <= MAX_ERRORS_PER_SESSION) {
        if (onError) {
          onError(error, raw);
        } else {
          console.error('[RealtimeHandler] Payload validation failed:', error, raw);
        }
      }
      
      // TODO: Send to monitoring service in production
      // if (import.meta.env.PROD) {
      //   monitoringService.captureException(error, { payload: raw });
      // }
      
      return;
    }
    
    try {
      handler(raw);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (onError) {
        onError(error, raw);
      } else {
        console.error('[RealtimeHandler] Handler error:', error, raw);
      }
    }
  };