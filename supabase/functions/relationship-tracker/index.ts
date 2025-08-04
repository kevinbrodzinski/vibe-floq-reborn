import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logInvocation, EdgeLogStatus, withTimeout } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RelationshipPair {
  profile_id_a: string;
  profile_id_b: string;
  proximity_meters: number;
  shared_vibe?: string;
  venue_id?: string;
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
    console.error("Relationship tracker error:", err);
    
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } finally {
    await logInvocation({
      functionName: 'relationship-tracker',
      status,
      durationMs: Date.now() - startTime,
      errorMessage,
      metadata
    });
  }

  async function doWork() {
    const body = await req.json();
    const { profile_id, nearby_users, current_vibe, venue_id } = body;

    if (!profile_id || !Array.isArray(nearby_users)) {
      return new Response(JSON.stringify({ error: "Invalid parameters" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing relationships for user ${profile_id} with ${nearby_users.length} nearby users`);

    // Generate relationship pairs with deterministic ordering
    const relationshipPairs: RelationshipPair[] = [];
    
    for (const nearbyUser of nearby_users) {
      if (nearbyUser.profile_id === profile_id) continue; // Skip self
      
      // Deterministic ordering: smaller UUID first
      const userA = profile_id < nearbyUser.profile_id ? profile_id : nearbyUser.profile_id;
      const userB = profile_id < nearbyUser.profile_id ? nearbyUser.profile_id : profile_id;
      
      relationshipPairs.push({
        profile_id_a: userA,
        profile_id_b: userB,
        proximity_meters: nearbyUser.distance_meters || 100,
        shared_vibe: nearbyUser.vibe === current_vibe ? current_vibe : undefined,
        venue_id: venue_id
      });
    }

    if (relationshipPairs.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Bulk upsert relationships using the new SQL function
    const { data, error } = await supabase.rpc('bulk_upsert_relationships', {
      relationship_pairs: relationshipPairs
    });

    if (error) {
      console.error("Relationship tracking error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Successfully processed ${relationshipPairs.length} relationship pairs`);

    // Set metadata for logging with size guards
    metadata = {
      nearby_users_count: nearby_users.length,
      relationship_pairs_generated: relationshipPairs.length,
      relationships_updated: data || 0,
      user_id,
      current_vibe,
      venue_id,
      // Sample of pairs for debugging (first 5 only)
      pairs_sample: relationshipPairs.slice(0, 5),
      pairs_total_count: relationshipPairs.length
    };

    return new Response(JSON.stringify({ 
      processed: relationshipPairs.length,
      relationships_updated: data || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } // End of doWork function
});