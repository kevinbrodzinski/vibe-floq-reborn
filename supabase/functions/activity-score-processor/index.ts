import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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

    return new Response(JSON.stringify({ 
      results,
      cleanup_count: cleanupData || 0,
      total_processed: results.filter(r => r.processed).length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Activity score processor error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});