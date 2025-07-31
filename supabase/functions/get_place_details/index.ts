// Deno runtime • cache Google Places Details in public.place_details
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";
import { z } from "https://esm.sh/zod@3";

const FIELDS =
  "id,displayName,formattedAddress,types,googleMapsUri,rating,userRatingCount";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const Input = z.object({ place_id: z.string().min(1) });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { place_id } = Input.parse(await req.json());

    /* read-side client (RLS-on) */
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { data: cached } = await sb
      .from("place_details")
      .select("data, is_expired")
      .eq("place_id", place_id)
      .maybeSingle();

    if (cached && !cached.is_expired)
      return new Response(JSON.stringify(cached.data), { headers: cors });

    /* server-side call */
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${place_id}?fields=${FIELDS}`,
      {
        headers: {
          "X-Goog-Api-Key": Deno.env.get("GOOGLE_PLACES_KEY")!,
          "X-Goog-FieldMask": FIELDS,
        },
      },
    );
    if (!res.ok)
      return new Response(res.body, { status: res.status, headers: cors });

    const place = await res.json();

    /* write-side client (service-role) */
    const sr = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    await sr.from("place_details")
      .upsert({ place_id, data: place });

    return new Response(JSON.stringify(place), { headers: cors });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: cors },
    );
  }
});