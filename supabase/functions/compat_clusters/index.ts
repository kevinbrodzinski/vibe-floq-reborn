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
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }), 
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization format" }), 
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    let lat: number, lng: number, vibe: string;

    // Handle both GET (URL params) and POST (JSON body) requests
    if (req.method === 'GET') {
      const url = new URL(req.url);
      lat = Number(url.searchParams.get('lat'));
      lng = Number(url.searchParams.get('lng'));
      vibe = url.searchParams.get('vibe') || '';
    } else if (req.method === 'POST') {
      const body = await req.json();
      lat = Number(body.lat);
      lng = Number(body.lng);
      vibe = body.vibe || '';
    } else {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }), 
        { 
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

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
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: `Bearer ${jwt}` }
        }
      }
    );

    const { data, error } = await supabase.rpc("get_compat_clusters", {
      u_lat: lat,
      u_lng: lng,
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
      status: 200,
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json", 
        "Cache-Control": "max-age=10" 
      }
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