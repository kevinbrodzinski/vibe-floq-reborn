// Deno Edge Function: venues-tile
// Input: { bbox? | center+radius?, zoom }
// Output: { venues: TileVenue[], ttlSec, attribution[] }

import { corsHeaders } from '../_shared/cors.ts';

type GPlace = {
  place_id: string; 
  name: string; 
  geometry: { location: { lat: number; lng: number } };
  opening_hours?: { open_now?: boolean };
  types?: string[];
  user_ratings_total?: number;
};

const GOOGLE_KEY = Deno.env.get("GOOGLE_PLACES_KEY");

function okJson(body: unknown, ttlSec = 900): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${ttlSec}`,
    },
  });
}

function bad(msg: string, code = 400) {
  return new Response(JSON.stringify({ error: msg }), { 
    status: code, 
    headers: { ...corsHeaders, "content-type": "application/json" } 
  });
}

// Google Nearby for bars/cafes/restaurants/nightlife
async function googleNearby(lng: number, lat: number, radius: number): Promise<GPlace[]> {
  if (!GOOGLE_KEY) return [];
  
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("type", "restaurant");
  url.searchParams.set("key", GOOGLE_KEY);

  const r = await fetch(url);
  if (!r.ok) return [];
  const j = await r.json();
  return (j.results ?? []) as GPlace[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return bad("POST required", 405);
    
    const input = await req.json();
    const { bbox, center, radius = 900, zoom } = input;

    // pick a center if bbox provided
    const [lng, lat] = center
      ?? (bbox ? [ (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2 ] : [-118.4695,33.9855]);

    // Fetch Google first (discovery)
    const places = await googleNearby(lng, lat, radius);

    // Map to tile venues; keep strictly minimal fields
    const venues = places.slice(0, 60).map((p) => ({
      pid: p.place_id,
      name: p.name,
      lng: p.geometry.location.lng,
      lat: p.geometry.location.lat,
      open_now: p.opening_hours?.open_now,
      score: p.user_ratings_total ?? undefined,
      src: ["google"] as Array<"google"|"fsq"|"besttime"|"floq">,
    }));

    const body = {
      venues,
      ttlSec: 900,
      attribution: ["Powered by Google", "© Mapbox"],
    };
    
    return okJson(body, body.ttlSec);
  } catch (e) {
    console.error('[venues-tile] error:', e);
    return bad(e?.message ?? "unknown error", 500);
  }
});
