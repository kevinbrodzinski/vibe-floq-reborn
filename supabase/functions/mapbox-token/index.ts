
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";

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
    // SECURITY: Authenticate user before providing admin token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[mapbox-token] Missing authorization header");
      return new Response(
        JSON.stringify({ error: 'Authentication required' }), 
        { 
          status: 401, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          } 
        }
      );
    }

    // Verify the JWT token
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log("[mapbox-token] Invalid or expired token:", authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }), 
        { 
          status: 401, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          } 
        }
      );
    }

    console.log(`[mapbox-token] Authenticated user: ${user.id}`);

    // Rate limiting: log access for monitoring
    console.log(`[mapbox-token] Token requested by user ${user.id} at ${new Date().toISOString()}`);

    // Get the admin Mapbox token
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
