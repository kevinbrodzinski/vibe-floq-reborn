export interface BaseRealtimePayload<T> {
  eventType: string;
  schema: string;
  table: string;
  commit_timestamp?: string;
  new: T | null;
  old: T | null;
}

/**
 * Validates a realtime payload to ensure it matches the expected structure.
 */
export const validateRealtimePayload = <T extends Record<string, unknown>>(
  payload: unknown
): payload is BaseRealtimePayload<T> => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'eventType' in (payload as object) &&
    'schema' in (payload as object) &&
    'table' in (payload as object)
  );
};

/**
 * Creates a safe realtime handler that validates payloads before invoking the callback.
 */
export const createSafeRealtimeHandler =
  <T extends Record<string, unknown>>(
    handler: (p: BaseRealtimePayload<T>) => void,
    onError?: (error: Error, payload: unknown) => void
  ) =>
  (raw: unknown) => {
    if (!validateRealtimePayload<T>(raw)) {
      onError?.(new Error('Invalid realtime payload'), raw);
      return;
    }
    try {
      handler(raw);
    } catch (err) {
      onError?.((err as Error), raw);
    }
  };