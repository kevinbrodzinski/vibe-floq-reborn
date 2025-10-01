import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { RelationshipTrackerSchema, parseJson } from "../_shared/zod.ts";
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

interface RelationshipPair {
  profile_id_a: string;
  profile_id_b: string;
  proximity_meters: number;
  shared_vibe?: string;
  venue_id?: string;
}

// Use service-role for bulk relationship updates (system operation)
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
    console.error("[relationship-tracker] Error:", err);
    
    return jsonRes(500, { error: (err as Error).message });
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
    // Parse and validate request body
    const body = await req.json().catch(() => null);
    const parsed = parseJson(RelationshipTrackerSchema, body, corsHeaders);
    if (parsed.error) return parsed.error;

    const { profile_id, nearby_users, current_vibe, venue_id } = parsed.data;

    console.log(`[relationship-tracker] Processing relationships for ${profile_id} with ${nearby_users.length} nearby users`);

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
        venue_id: venue_id ?? undefined
      });
    }

    if (relationshipPairs.length === 0) {
      return jsonRes(200, { processed: 0, relationships_updated: 0 });
    }

    // Bulk upsert relationships using SQL function
    const { data, error } = await supabase.rpc('bulk_upsert_relationships', {
      relationship_pairs: relationshipPairs
    });

    if (error) {
      console.error("[relationship-tracker] RPC error:", error);
      return jsonRes(500, { error: 'Relationship tracking failed' });
    }

    console.log(`[relationship-tracker] Processed ${relationshipPairs.length} pairs, updated ${data || 0} relationships`);

    // Set metadata for logging
    metadata = {
      nearby_users_count: nearby_users.length,
      relationship_pairs_generated: relationshipPairs.length,
      relationships_updated: data || 0,
      profile_id,
      current_vibe,
      venue_id
    };

    return jsonRes(200, { 
      processed: relationshipPairs.length,
      relationships_updated: data || 0
    });
  }
});
