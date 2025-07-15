import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');
    const vibe = url.searchParams.get('vibe');

    if (!lat || !lng || !vibe) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: lat, lng, vibe" }), 
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data, error } = await supabase.rpc("get_compat_clusters", {
      u_lat: parseFloat(lat),
      u_lng: parseFloat(lng),
      u_vibe: vibe,
    });

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: "Database query failed" }), 
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    return new Response(JSON.stringify(data ?? []), {
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json", 
        "Cache-Control": "max-age=10" 
      },
      status: 200,
    });

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }), 
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});