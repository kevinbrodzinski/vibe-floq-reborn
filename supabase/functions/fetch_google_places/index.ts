// Deno runtime • Google NearbySearch → integrations.place_feed_raw
import { serve }        from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";
import { mapToVenue, upsertVenues } from "../_shared/venues.ts";

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
    if (!profile_id || lat == null || lng == null) {
      return new Response(
        JSON.stringify({ error: "profile_id, lat & lng required" }),
        { status: 400, headers: CORS },
      );
    }

    /* ---- 1. server-stored API key --------------------------------- */
    const API_KEY = Deno.env.get("GOOGLE_PLACES_KEY");
    if (!API_KEY) {
      console.error("GOOGLE_PLACES_KEY missing");
      return new Response("server mis-config", { status: 500, headers: CORS });
    }

    /* ---- 2. call Google Places NearbySearch ----------------------- */
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
    );
    url.searchParams.set("key", API_KEY);
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", "150");            // metres
    url.searchParams.set("type", "point_of_interest");

    const gp = await fetch(url).then((r) => r.json());
    if (gp.status !== "OK" && gp.status !== "ZERO_RESULTS") {
      console.error("Google error", gp);
      return new Response(JSON.stringify({ error: gp.error_message }), {
        status: 502,
        headers: CORS,
      });
    }

    /* ---- 3. transform + upsert venues ----------------------------- */
    const mapped = gp.results.map((r: any) => mapToVenue({ provider: "google", r }));
    await upsertVenues(mapped);

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