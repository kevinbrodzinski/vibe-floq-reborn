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

export async function logInvocation(opts: EdgeLogOptions) {
  try {
    await supabase.from('edge_invocation_logs').insert({
      function_name: opts.functionName,
      status: opts.status,
      duration_ms: opts.durationMs,
      error_message: opts.errorMessage,
      metadata: opts.metadata ?? {}
    });
  } catch (err) {
    // Never let logging kill the function
    console.error(`[edge-logger] failed:`, err);
  }
}