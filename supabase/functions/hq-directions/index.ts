// Deno Edge: get a walking/driving route from origin -> dest using Mapbox Directions.
// Requires secret: MAPBOX_ACCESS_TOKEN
import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Mode = "walking" | "driving";
type Req = { origin: { lat:number; lng:number }, dest:{ lat:number; lng:number }, mode?: Mode };
type Step = { distance_m: number; duration_s: number; instruction: string };
type Resp = {
  geometry: { type: "LineString"; coordinates: [number, number][] };
  distance_m: number;
  duration_s: number;
  steps: Step[];
};

function fmtInstruction(m: any) {
  // Compact human text; Mapbox provides maneuver + name.
  const name = m?.instruction ?? m?.maneuver?.instruction ?? m?.name ?? "";
  return name || "Continue";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { origin, dest, mode = "walking" } = await req.json() as Req;
    if (!origin || !dest) throw new Error("origin, dest required");

    const token = Deno.env.get("MAPBOX_ACCESS_TOKEN");
    if (!token) throw new Error("Missing MAPBOX_ACCESS_TOKEN");

    const profile = mode === "driving" ? "mapbox/driving" : "mapbox/walking";
    const url =
      `https://api.mapbox.com/directions/v5/${profile}/${origin.lng},${origin.lat};${dest.lng},${dest.lat}` +
      `?geometries=geojson&overview=full&steps=true&access_token=${token}`;

    const r = await fetch(url);
    if (!r.ok) throw new Error(`Directions HTTP ${r.status}`);
    const j = await r.json();

    const route = j?.routes?.[0];
    if (!route) throw new Error("No route");

    const steps: Step[] = (route?.legs?.[0]?.steps ?? []).map((s: any) => ({
      distance_m: s?.distance ?? 0,
      duration_s: s?.duration ?? 0,
      instruction: fmtInstruction(s),
    }));

    const resp: Resp = {
      geometry: route.geometry,
      distance_m: route.distance ?? 0,
      duration_s: route.duration ?? 0,
      steps,
    };

    return new Response(JSON.stringify(resp), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 400,
      headers: cors,
    });
  }
});