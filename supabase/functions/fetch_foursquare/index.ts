// Deno runtime • Foursquare Nearby → integrations.place_feed_raw
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")
    return new Response("POST only", { status: 405, headers: CORS });

  try {
    const { user_id, lat, lng } = await req.json() as {
      user_id?: string;
      lat?: number;
      lng?: number;
    };
    if (!user_id || lat == null || lng == null) {
      return new Response(
        JSON.stringify({ error: "user_id, lat & lng required" }),
        { status: 400, headers: CORS },
      );
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    /* 1 ─ fetch FSQ key */
    const { data: cred } = await sb
      .from("integrations.user_credential")
      .select("api_key")
      .eq("profile_id", profile_id)
      .eq("provider_id", 2)      // 2 = foursquare
      .maybeSingle();

    if (!cred)
      return new Response(JSON.stringify({ error: "no Foursquare key" }), {
        status: 400,
        headers: CORS,
      });

    /* 2 ─ call FSQ */
    const url =
      `https://api.foursquare.com/v3/places/nearby?ll=${lat},${lng}&radius=150&limit=25`;
    const fsq = await fetch(url, {
      headers: { Accept: "application/json", Authorization: cred.api_key },
    }).then((r) => r.json());

    if (fsq.message)
      return new Response(JSON.stringify({ error: fsq.message }), {
        status: 502,
        headers: CORS,
      });

    /* 3 ─ dump */
    await sb.from("integrations.place_feed_raw")
      .insert({ user_id, provider_id: 2, payload: fsq });

    return new Response(
      JSON.stringify({ ok: true, count: fsq.results?.length ?? 0 }),
      { headers: CORS },
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: CORS },
    );
  }
});