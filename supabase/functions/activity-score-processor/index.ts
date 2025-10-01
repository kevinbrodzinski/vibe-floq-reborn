import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { ActivityEventsSchema, parseJson } from "../_shared/zod.ts";
import { logInvocation, EdgeLogStatus, withTimeout } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

// Use service-role for bulk activity scoring (system operation)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonRes(405, { error: 'Method not allowed' });
  }

  const startTime = Date.now();
  let status: EdgeLogStatus = 'success';
  let errorMessage: string | null = null;
  let metadata: Record<string, unknown> = {};

  try {
    const result = await withTimeout(doWork(), 45_000);
    return result;
  } catch (err) {
    if ((err as Error).message === 'function timed out') {
      status = 'timeout';
      errorMessage = 'Function execution timed out';
      return jsonRes(504, { error: 'Request timeout' });
    }
    
    status = 'error';
    errorMessage = (err as Error).message;
    console.error("[activity-score-processor] Error:", err);
    
    return jsonRes(500, { error: (err as Error).message });
  } finally {
    await logInvocation({
      functionName: 'activity-score-processor',
      status,
      durationMs: Date.now() - startTime,
      errorMessage,
      metadata
    });
  }

  async function doWork() {
    // Parse and validate request body
    const body = await req.json().catch(() => null);
    const parsed = parseJson(ActivityEventsSchema, body, corsHeaders);
    if (parsed.error) return parsed.error;

    const { events } = parsed.data;

    console.log(`[activity-score-processor] Processing ${events.length} activity events`);

    const results = [];

    // Process events in batches
    for (const event of events) {
      try {
        // Calculate activity score using SQL function
        const { data: scoreData, error: scoreError } = await supabase.rpc('calculate_floq_activity_score', {
          p_floq_id: event.floq_id,
          p_event_type: event.event_type,
          p_proximity_boost: event.proximity_users || 0
        });

        if (scoreError) {
          console.error(`[activity-score-processor] Score error for floq ${event.floq_id}:`, scoreError);
          results.push({
            floq_id: event.floq_id,
            processed: false,
            error: scoreError.message
          });
          continue;
        }

        // Log activity in history
        const { error: historyError } = await supabase
          .from('flock_history')
          .insert({
            floq_id: event.floq_id,
            event_type: event.event_type,
            user_id: event.user_id,
            new_vibe: event.vibe,
            metadata: {
              proximity_users: event.proximity_users,
              timestamp: event.timestamp || new Date().toISOString()
            }
          });

        if (historyError) {
          console.error(`[activity-score-processor] History error for floq ${event.floq_id}:`, historyError);
        }

        results.push({
          floq_id: event.floq_id,
          new_score: scoreData?.new_score || 0,
          processed: true
        });

      } catch (eventError) {
        console.error(`[activity-score-processor] Event error for floq ${event.floq_id}:`, eventError);
        results.push({
          floq_id: event.floq_id,
          processed: false,
          error: (eventError as Error).message
        });
      }
    }

    // Clean up expired floqs
    const { data: cleanupData, error: cleanupError } = await supabase.rpc('cleanup_inactive_floqs');
    
    if (cleanupError) {
      console.error("[activity-score-processor] Cleanup error:", cleanupError);
    }

    console.log(`[activity-score-processor] Processed ${results.length} events, cleaned ${cleanupData || 0} inactive floqs`);

    // Set metadata for logging
    metadata = {
      events_processed: events.length,
      successful_events: results.filter(r => r.processed).length,
      failed_events: results.filter(r => !r.processed).length,
      cleanup_count: cleanupData || 0
    };

    return jsonRes(200, { 
      results,
      cleanup_count: cleanupData || 0,
      total_processed: results.filter(r => r.processed).length
    });
  }
});
