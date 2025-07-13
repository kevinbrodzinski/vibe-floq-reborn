import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logInvocation, EdgeLogStatus, withTimeout } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActivityEvent {
  floq_id: string;
  event_type: 'join' | 'leave' | 'vibe_change' | 'proximity_update';
  user_id: string;
  proximity_users?: number;
  vibe?: string;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
      return new Response(JSON.stringify({ error: "Request timeout" }), {
        status: 504,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    status = 'error';
    errorMessage = (err as Error).message;
    console.error("Activity score processor error:", err);
    
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
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
    const body = await req.json();
    const { events } = body;

    if (!Array.isArray(events)) {
      return new Response(JSON.stringify({ error: "Events must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing ${events.length} activity events`);

    const results = [];

    // Process events in batches
    for (const event of events as ActivityEvent[]) {
      try {
        // Calculate activity score using our SQL function
        const { data: scoreData, error: scoreError } = await supabase.rpc('calculate_floq_activity_score', {
          p_floq_id: event.floq_id,
          p_event_type: event.event_type,
          p_proximity_boost: event.proximity_users || 0
        });

        if (scoreError) {
          console.error(`Score calculation error for floq ${event.floq_id}:`, scoreError);
          continue;
        }

        // Log the activity in history
        const { error: historyError } = await supabase
          .from('flock_history')
          .insert({
            floq_id: event.floq_id,
            event_type: event.event_type,
            user_id: event.user_id,
            new_vibe: event.vibe,
            metadata: {
              proximity_users: event.proximity_users,
              timestamp: new Date().toISOString()
            }
          });

        if (historyError) {
          console.error(`History logging error for floq ${event.floq_id}:`, historyError);
        }

        results.push({
          floq_id: event.floq_id,
          new_score: scoreData?.new_score || 0,
          processed: true
        });

      } catch (eventError) {
        console.error(`Error processing event for floq ${event.floq_id}:`, eventError);
        results.push({
          floq_id: event.floq_id,
          processed: false,
          error: (eventError as Error).message
        });
      }
    }

    // Clean up expired floqs (activity score = 0 and ended)
    const { data: cleanupData, error: cleanupError } = await supabase.rpc('cleanup_inactive_floqs');
    
    if (cleanupError) {
      console.error("Cleanup error:", cleanupError);
    }

    console.log(`Processed ${results.length} events, cleaned up ${cleanupData || 0} inactive floqs`);

    // Set metadata for logging with size guards
    metadata = {
      events_processed: events.length,
      successful_events: results.filter(r => r.processed).length,
      failed_events: results.filter(r => !r.processed).length,
      cleanup_count: cleanupData || 0,
      // Sample of results for debugging (first 5 only)
      results_sample: results.slice(0, 5),
      results_total_count: results.length
    };

    return new Response(JSON.stringify({ 
      results,
      cleanup_count: cleanupData || 0,
      total_processed: results.filter(r => r.processed).length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } // End of doWork function
});