
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
} as const;

serve(async (req: Request): Promise<Response> => {
  console.log(`[mapbox-token] ${req.method} request received`);
  
  if (req.method === "OPTIONS") {
    console.log("[mapbox-token] Handling CORS preflight");
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log("[mapbox-token] Checking for ADMIN_MAP_TOKEN secret...");
    const mapboxToken = Deno.env.get('ADMIN_MAP_TOKEN');
    
    if (!mapboxToken) {
      console.error("[mapbox-token] Secret ADMIN_MAP_TOKEN not found");
      return new Response(
        JSON.stringify({ error: 'Mapbox access token not configured' }), 
        { 
          status: 500, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          } 
        }
      );
    }

    console.log("[mapbox-token] Token found, returning success");
    return new Response(
      JSON.stringify({ token: mapboxToken }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=60',
          'Vary': 'Origin'
        } 
      }
    );
  } catch (error) {
    console.error("[mapbox-token] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve Mapbox token' }), 
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        } 
      }
    );
  }
});
