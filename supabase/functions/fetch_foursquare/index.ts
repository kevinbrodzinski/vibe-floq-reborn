// Deno runtime • Foursquare Nearby → integrations.place_feed_raw
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

    /* ---- 1. server-stored FSQ key --------------------------------- */
    const API_KEY = Deno.env.get("FOURSQUARE_ADMIN_API");
    if (!API_KEY) {
      console.error("FOURSQUARE_ADMIN_API missing");
      return new Response("server mis-config", { status: 500, headers: CORS });
    }

    /* ---- 2. call Foursquare “Nearby” ------------------------------ */
    const url =
      `https://api.foursquare.com/v3/places/nearby?ll=${lat},${lng}&radius=150&limit=25`;
    const fsq = await fetch(url, {
      headers: { Accept: "application/json", Authorization: API_KEY },
    }).then((r) => r.json());

    if (fsq.message)
      return new Response(JSON.stringify({ error: fsq.message }), {
        status: 502,
        headers: CORS,
      });

    /* ---- 3. transform + upsert venues ----------------------------- */
    const mapped = fsq.results.map((r: any) => mapToVenue({ provider: "foursquare", r }));
    await upsertVenues(mapped);

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