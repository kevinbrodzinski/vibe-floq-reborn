import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! }
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    // Payload: { context, floq_id?, venue_id?, rally_id?, vec, features?, confidence? }
    const payload = await req.json();
    
    // Validate required fields
    if (!payload.context || !payload.vec) {
      throw new Error("Missing required fields: context, vec");
    }

    // Validate context
    const validContexts = ['solo', 'floq', 'venue', 'rally', 'plan'];
    if (!validContexts.includes(payload.context)) {
      throw new Error(`Invalid context. Must be one of: ${validContexts.join(', ')}`);
    }

    // Insert vibe snapshot
    const { error } = await supabase.from("vibe_snapshots").insert({
      profile_id: user.id,
      context: payload.context,
      floq_id: payload.floq_id || null,
      venue_id: payload.venue_id || null,
      rally_id: payload.rally_id || null,
      vec: payload.vec,
      features: payload.features || {},
      confidence: payload.confidence || null,
      source: 'device'
    });

    if (error) {
      console.error("Error inserting vibe snapshot:", error);
      throw error;
    }

    console.log(`Vibe snapshot recorded: ${user.id} in ${payload.context}`);

    return new Response(
      JSON.stringify({ ok: true, message: "Vibe snapshot recorded successfully" }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in wings-vibe-sample:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});