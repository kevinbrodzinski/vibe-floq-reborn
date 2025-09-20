// Deno Edge Function: venues-tile
// Input: POST JSON:
//   { bbox?: [w,s,e,n], center?: [lng,lat], radius?: number, zoom?: number,
//     categories?: string[], openNow?: boolean }
// Output: 200 JSON { venues: TileVenue[], ttlSec: number, attribution: string[] }

import { handlePreflight, okJSONCached, badJSON } from "../_shared/cors.ts";

type GPlace = {
  place_id: string;
  name: string;
  geometry: { location: { lat: number; lng: number } };
  opening_hours?: { open_now?: boolean };
  types?: string[];
  user_ratings_total?: number;
  business_status?: string;
};

type Input = {
  bbox?: [number, number, number, number];
  center?: [number, number];            // [lng, lat]
  radius?: number;                      // meters
  zoom?: number;
  categories?: string[];                // eg: ['coffee','bars','food','nightlife']
  openNow?: boolean;
};

const GOOGLE_KEY = Deno.env.get("GOOGLE_PLACES_KEY");

// minimal mapping (expand as needed)
const CATEGORY_TO_TYPE: Record<string, string> = {
  coffee: "cafe",
  bars: "bar",
  food: "restaurant",
  nightlife: "night_club",
  restaurant: "restaurant",
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

// Google Nearby for top categories (1 call per request)
async function googleNearby(
  lng: number,
  lat: number,
  radius: number,
  type: string,
  openNow?: boolean
): Promise<GPlace[]> {
  if (!GOOGLE_KEY) return [];

  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);      // Places expects "lat,lng"
  url.searchParams.set("radius", String(radius));         // must be <= 50,000
  url.searchParams.set("type", type);                     // single type per call
  if (openNow) url.searchParams.set("opennow", "true");
  url.searchParams.set("key", GOOGLE_KEY);

  const r = await fetch(url);
  if (!r.ok) {
    console.warn("[venues-tile] Google nearby failed:", r.status, await r.text().catch(()=>""));
    return [];
  }
  const j = await r.json().catch(() => ({}));
  return (j?.results ?? []) as GPlace[];
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  if (!GOOGLE_KEY) return badJSON("GOOGLE_PLACES_KEY missing", req, 500);

  try {
    if (req.method !== "POST") return badJSON("POST required", req, 405);

    const input = (await req.json().catch(() => ({}))) as Partial<Input>;
    const { bbox, center, zoom, openNow = false } = input;

    // radius: sensible defaults + clamp (Google max 50km)
    const radius = clamp(Number(input.radius ?? 900), 50, 50_000);

    // choose center
    const chosen = Array.isArray(center) && center.length === 2
      ? center
      : (Array.isArray(bbox) && bbox.length === 4
          ? [ (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2 ] as [number, number]
          : [-118.4695, 33.9855] as [number, number]); // Santa Monica fallback

    const [lng, lat] = chosen.map(Number) as [number, number];
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return badJSON("Valid center or bbox required", req, 400);
    }

    // choose a single Places "type" from categories (first match wins)
    let type = "restaurant";
    if (Array.isArray(input.categories) && input.categories.length) {
      const norm = input.categories.map(c => String(c).toLowerCase().trim());
      for (const key of norm) {
        if (CATEGORY_TO_TYPE[key]) { type = CATEGORY_TO_TYPE[key]; break; }
      }
    }

    // fetch Google nearby
    const places = await googleNearby(lng, lat, radius, type, openNow);

    // map to the tile venue shape, keep minimal fields
    const venues = places.slice(0, 60).map((p) => ({
      pid: p.place_id,
      name: p.name,
      lng: p.geometry.location.lng,
      lat: p.geometry.location.lat,
      open_now: p.opening_hours?.open_now ?? null,
      score: p.user_ratings_total ?? undefined,
      src: ["google"] as Array<"google"|"fsq"|"besttime"|"floq">,
    }));

    const body = {
      venues,
      ttlSec: 900,
      attribution: ["Powered by Google", "© Mapbox"],
      meta: { type, radius, zoom: zoom ?? null },
    };

    // cached JSON (adds Cache-Control) + full CORS headers
    return okJSONCached(body, req, body.ttlSec);
  } catch (e) {
    console.error("[venues-tile] error:", e);
    return badJSON(e?.message ?? "unknown error", req, 500);
  }
});