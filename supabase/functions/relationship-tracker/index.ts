import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RelationshipPair {
  user_a_id: string;
  user_b_id: string;
  proximity_meters: number;
  shared_vibe?: string;
  venue_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // Use service role for background tasks
    );

    const body = await req.json();
    const { user_id, nearby_users, current_vibe, venue_id } = body;

    if (!user_id || !Array.isArray(nearby_users)) {
      return new Response(JSON.stringify({ error: "Invalid parameters" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing relationships for user ${user_id} with ${nearby_users.length} nearby users`);

    // Generate relationship pairs with deterministic ordering
    const relationshipPairs: RelationshipPair[] = [];
    
    for (const nearbyUser of nearby_users) {
      if (nearbyUser.user_id === user_id) continue; // Skip self
      
      // Deterministic ordering: smaller UUID first
      const userA = user_id < nearbyUser.user_id ? user_id : nearbyUser.user_id;
      const userB = user_id < nearbyUser.user_id ? nearbyUser.user_id : user_id;
      
      relationshipPairs.push({
        user_a_id: userA,
        user_b_id: userB,
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
      pairs: relationshipPairs
    });

    if (error) {
      console.error("Relationship tracking error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Successfully processed ${relationshipPairs.length} relationship pairs`);

    return new Response(JSON.stringify({ 
      processed: relationshipPairs.length,
      relationships_updated: data || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Relationship tracker error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});