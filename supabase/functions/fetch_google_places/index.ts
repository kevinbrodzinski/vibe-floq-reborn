// Deno runtime • Google NearbySearch → integrations.place_feed_raw
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
    const { profile_id, lat, lng } = await req.json() as {
      profile_id?: string;
      lat?: number;
      lng?: number;
    };
    if (!profile || lat == null || lng == null) {
      return new Response(
        JSON.stringify({ error: "profile_id, lat & lng required" }),
        { status: 400, headers: CORS },
      );
    }

    /* ── Supabase (service-role, bypass RLS) ───────────────────── */
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    /* 1 ─ fetch caller's Google key */
    const { data: cred } = await sb
      .from("integrations.user_credential")
      .select("api_key")
      .eq("profile_id", profile_id)
      .eq("provider_id", 1)      // 1 = google
      .maybeSingle();

    if (!cred)
      return new Response(JSON.stringify({ error: "no Google key" }), {
        status: 400,
        headers: CORS,
      });

    /* 2 ─ call Google Places NearbySearch (Essentials) */
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
    );
    url.searchParams.set("key", cred.api_key);
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", "150");
    url.searchParams.set("type", "point_of_interest");

    const gp = await fetch(url).then((r) => r.json());
    if (gp.status !== "OK" && gp.status !== "ZERO_RESULTS") {
      console.error("Google error", gp);
      return new Response(JSON.stringify({ error: gp.error_message }), {
        status: 502,
        headers: CORS,
      });
    }

    /* 3 ─ dump raw payload */
    await sb.from("integrations.place_feed_raw")
      .insert({ profile_id, provider_id: 1, payload: gp });

    return new Response(
      JSON.stringify({ ok: true, count: gp.results?.length ?? 0 }),
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