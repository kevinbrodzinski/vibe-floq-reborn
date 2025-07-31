import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";
import { z } from "https://esm.sh/zod";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const input = z.object({ place_id: z.string().min(1) });
const FIELDS = "id,displayName,formattedAddress,types,googleMapsUri,rating,userRatingCount";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { place_id } = input.parse(await req.json());

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    /* 1 ─ cache lookup */
    const { data: cached } = await supabase
      .from("place_details")
      .select("data, fetched_at")
      .eq("place_id", place_id)
      .maybeSingle();

    if (cached && Date.now() - Date.parse(cached.fetched_at) < 7 * 24 * 3600 * 1000) {
      return new Response(JSON.stringify(cached.data), {
        headers: corsHeaders
      });
    }

    /* 2 ─ server-to-server call */
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${place_id}?fields=${FIELDS}`,
      {
        headers: {
          "X-Goog-Api-Key": Deno.env.get("GOOGLE_PLACES_KEY")!,
          "X-Goog-FieldMask": FIELDS
        }
      }
    );
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Google Places API error:', errorText);
      return new Response(
        JSON.stringify({ error: `Google Places API error: ${res.status}` }),
        { status: res.status, headers: corsHeaders }
      );
    }

    const place = await res.json();

    /* 3 ─ upsert cache (service-role for bypass) */
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    await serviceSupabase
      .from("place_details")
      .upsert({ place_id, data: place })
      .eq("place_id", place_id);

    return new Response(JSON.stringify(place), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('get_place_details error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});