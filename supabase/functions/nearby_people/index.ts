import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { NearbyPeopleSchema, parseJson } from "../_shared/zod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonRes(405, { error: 'Method not allowed' });
  }

  try {
    // Use anon client with auth for RLS-safe queries
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' }
        }
      }
    );

    // Validate auth (optional for this endpoint, but good practice)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return jsonRes(401, { error: 'Unauthorized' });
    }

    // Parse and validate request body
    const body = await req.json().catch(() => null);
    const parsed = parseJson(NearbyPeopleSchema, body, corsHeaders);
    if (parsed.error) return parsed.error;

    const { lat, lng, limit } = parsed.data;

    console.log(`[nearby_people] Fetching nearby people: lat=${lat}, lng=${lng}, limit=${limit}`);

    // Call RPC with validated parameters
    const { data, error } = await supabase.rpc('rank_nearby_people', {
      p_lat: lat,
      p_lng: lng,
      p_limit: limit
    });

    if (error) {
      console.error('[nearby_people] RPC error:', error);
      return jsonRes(500, { error: 'Failed to fetch nearby people' });
    }

    return jsonRes(200, {
      results: data ?? [],
      count: data?.length ?? 0
    });

  } catch (error) {
    console.error('[nearby_people] Unexpected error:', error);
    return jsonRes(500, { error: 'Internal server error' });
  }
});
