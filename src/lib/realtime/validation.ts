/**
 * Realtime payload validation utilities to prevent TypeError: Cannot convert undefined or null to object
 */

export interface RealtimePayload {
  new?: Record<string, any> | null;
  old?: Record<string, any> | null;
  eventType?: string;
  schema?: string;
  table?: string;
  commit_timestamp?: string;
}

/**
 * Validates a realtime payload to ensure it's safe to process
 */
export const validateRealtimePayload = (payload: any): payload is RealtimePayload => {
  if (!payload || typeof payload !== 'object') {
    console.warn('[RealtimeValidation] Invalid payload: not an object', payload);
    return false;
  }

  // Check if payload has the expected structure
  const hasValidStructure = 
    typeof payload.eventType === 'string' &&
    typeof payload.schema === 'string' &&
    typeof payload.table === 'string';

  if (!hasValidStructure) {
    console.warn('[RealtimeValidation] Invalid payload structure', payload);
    return false;
  }

  return true;
};

/**
 * Safely extracts the 'new' record from a realtime payload
 */
export const safeGetNewRecord = (payload: any): Record<string, any> | null => {
  if (!validateRealtimePayload(payload)) {
    return null;
  }

  const newRecord = payload.new;
  if (newRecord && typeof newRecord === 'object' && !Array.isArray(newRecord)) {
    return newRecord;
  }

  console.warn('[RealtimeValidation] Invalid new record in payload', { payload, newRecord });
  return null;
};

/**
 * Safely extracts the 'old' record from a realtime payload
 */
export const safeGetOldRecord = (payload: any): Record<string, any> | null => {
  if (!validateRealtimePayload(payload)) {
    return null;
  }

  const oldRecord = payload.old;
  if (oldRecord && typeof oldRecord === 'object' && !Array.isArray(oldRecord)) {
    return oldRecord;
  }

  console.warn('[RealtimeValidation] Invalid old record in payload', { payload, oldRecord });
  return null;
};

/**
 * Creates a safe realtime handler that validates payloads before processing
 */
export const createSafeRealtimeHandler = <T = any>(
  handler: (payload: RealtimePayload) => void,
  errorHandler?: (error: Error, payload: any) => void
) => {
  return (payload: any) => {
    try {
      if (!validateRealtimePayload(payload)) {
        const error = new Error(`Invalid realtime payload structure`);
        if (errorHandler) {
          errorHandler(error, payload);
        } else {
          console.error('[RealtimeHandler] Payload validation failed:', error, payload);
        }
        return;
      }

      handler(payload);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (errorHandler) {
        errorHandler(err, payload);
      } else {
        console.error('[RealtimeHandler] Handler error:', err, payload);
      }
    }
  };
};

/**
 * Logs realtime payload for debugging
 */
export const debugRealtimePayload = (payload: any, context: string = 'Unknown') => {
  if (import.meta.env.DEV) {
    console.log(`[RealtimeDebug:${context}] Payload:`, {
      eventType: payload?.eventType,
      schema: payload?.schema,
      table: payload?.table,
      new: payload?.new ? 'present' : 'missing',
      old: payload?.old ? 'present' : 'missing',
      fullPayload: payload
    });
  }
};