import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export type EdgeLogStatus = 'success' | 'error' | 'timeout';

interface EdgeLogOptions {
  functionName: string;
  status: EdgeLogStatus;
  durationMs: number;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

// Helper to truncate large metadata arrays to prevent write-amplification
function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    if (Array.isArray(value) && value.length > 5) {
      result[`${key}_sample`] = value.slice(0, 5);
      result[`${key}_total_count`] = value.length;
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

export async function logInvocation(opts: EdgeLogOptions) {
  try {
    await supabase.from('edge_invocation_logs').insert({
      function_name: opts.functionName,
      status: opts.status,
      duration_ms: opts.durationMs,
      error_message: opts.errorMessage,
      metadata: sanitizeMetadata(opts.metadata ?? {})
    });
  } catch (err) {
    // Never let logging kill the function
    console.error(`[edge-logger] failed:`, err);
  }
}

// Timeout wrapper for long-running operations
export async function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = 45_000
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('function timed out')), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}