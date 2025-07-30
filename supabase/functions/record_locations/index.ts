import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------- CORS helper ----------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const { batch } = await req.json();
    
    if (!Array.isArray(batch) || batch.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid batch data" }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`Recording ${batch.length} location entries`);

    // Process the batch of location data
    // This would typically insert into a locations table
    // For now, just log it as the actual table structure isn't visible
    console.log("Location batch:", batch);

    return new Response(
      null, 
      { 
        status: 204, 
        headers: corsHeaders 
      }
    );
  } catch (error) {
    console.error("Record locations error:", error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
