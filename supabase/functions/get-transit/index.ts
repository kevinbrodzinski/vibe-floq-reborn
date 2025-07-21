// ─────────────────────────────────────────────────────────────
//  📁 supabase/functions/get-transit/index.ts
//  Edge function (TypeScript) for fetching & caching Mapbox
//  Directions results. Deploy with `supabase functions deploy`.
// ─────────────────────────────────────────────────────────────
// ENV VARS required (set via `supabase secrets set`):
//   MAPBOX_ACCESS_TOKEN – Mapbox access token
//   SUPABASE_URL        – injected automatically
//   SUPABASE_ANON_KEY   – injected automatically
// ─────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransitRequest {
  planId: string; // UUID of the plan (for cache scoping)
  from: { lat: number; lng: number; stopId: string };
  to: { lat: number; lng: number; stopId: string };
  mode?: "driving" | "walking" | "cycling";
}

const MAPBOX_URL = "https://api.mapbox.com/directions/v5/mapbox";
const MAPBOX_TOKEN = Deno.env.get("MAPBOX_ACCESS_TOKEN");

if (!MAPBOX_TOKEN) {
  console.error("MAPBOX_ACCESS_TOKEN missing – set via supabase secrets");
}

serve(async (req) => {
  // CORS pre‑flight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  let body: TransitRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const mode = body.mode ?? "driving";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false },
  });

  // 1️⃣  Check cache first
  const { data: cached, error: cacheErr } = await supabase
    .from("plan_transit_cache")
    .select("id, transit_data")
    .eq("from_stop_id", body.from.stopId)
    .eq("to_stop_id", body.to.stopId)
    .maybeSingle();

  if (cacheErr) console.error(cacheErr);
  if (cached) {
    console.log(`Cache hit for ${body.from.stopId} → ${body.to.stopId}`);
    return new Response(JSON.stringify({ cached: true, ...cached.transit_data }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // 2️⃣  Build Mapbox query
  const coordStr = `${body.from.lng},${body.from.lat};${body.to.lng},${body.to.lat}`;
  const url = `${MAPBOX_URL}/${mode}/${coordStr}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`;

  console.log(`Fetching Mapbox: ${mode} from ${body.from.lat},${body.from.lng} to ${body.to.lat},${body.to.lng}`);

  const mbRes = await fetch(url);
  if (!mbRes.ok) {
    console.error(`Mapbox API error: ${mbRes.status} ${mbRes.statusText}`);
    return new Response(JSON.stringify({ error: "Mapbox request failed" }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const mbJson = await mbRes.json();
  const route = mbJson.routes?.[0];
  if (!route) {
    console.warn(`No route found between ${body.from.lat},${body.from.lng} and ${body.to.lat},${body.to.lng}`);
    return new Response(JSON.stringify({ error: "No route returned" }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const result = {
    duration_seconds: Math.round(route.duration),
    distance_meters: Math.round(route.distance),
    mode,
    provider: "mapbox",
    fetched_at: new Date().toISOString(),
  };

  // 3️⃣  Upsert into cache (ignore conflicts)
  const { error: upErr } = await supabase.from("plan_transit_cache").upsert(
    {
      plan_id: body.planId,
      from_stop_id: body.from.stopId,
      to_stop_id: body.to.stopId,
      transit_data: result,
      duration_seconds: result.duration_seconds,
      distance_meters: result.distance_meters,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "plan_id,from_stop_id,to_stop_id" },
  );
  if (upErr) console.error("Cache upsert error:", upErr);

  console.log(`Transit calculated: ${Math.round(route.duration/60)}min, ${Math.round(route.distance)}m for ${mode}`);

  return new Response(JSON.stringify({ cached: false, ...result }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});