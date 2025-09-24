// Supabase Edge Function: places-classify
// Enhanced venue classification with server-side API key management
// POST { lat: number, lng: number, includeRaw?: boolean }
// Returns: { key: string, ttl: number, result: VenueClassResult }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type VenueType = "nightclub" | "bar" | "coffee" | "restaurant" | "gym" | "park" | "office" | "general";

type VenueClassResult = {
  type: VenueType;
  energyBase: number;        // 0..1 (default 0.5)
  openNow?: boolean;
  rating?: number;           // 1..5
  ratingCount?: number;
  popularity?: number;       // 0..1 derived from rating & count
  vibes: Partial<Record<string, number>>;
  categories: string[];      // raw for telemetry (dev only)
  name?: string;
};

const GP_KEY = Deno.env.get("GOOGLE_PLACES_KEY") ?? "";
const FSQ_KEY = Deno.env.get("FSQ_SERVICE_KEY") ?? ""; // optional

// 250m grid key for consistent caching
function gridKey(lat: number, lng: number) {
  const sz = 0.0022; // ~250m lat
  const scale = Math.max(0.25, Math.cos((lat * Math.PI) / 180));
  const glat = Math.round(lat / sz) * sz;
  const glng = Math.round((lng * scale) / sz) * (sz / scale);
  return `${glat.toFixed(4)},${glng.toFixed(4)}`;
}

// Google Nearby Search (rankby=distance for precision)
async function googleNear(lat: number, lng: number) {
  if (!GP_KEY) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("rankby", "distance");
  url.searchParams.set("type", "establishment");
  url.searchParams.set("key", GP_KEY);
  
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url.toString(), { signal: ctrl.signal });
    if (!res.ok) return null;
    const j = await res.json();
    return (j.results?.[0]) ?? null;
  } catch { 
    return null; 
  } finally { 
    clearTimeout(timer); 
  }
}

// Optional FSQ enrichment
async function fsqNear(lat: number, lng: number) {
  if (!FSQ_KEY) return null;
  const url = new URL("https://api.foursquare.com/v3/places/search");
  url.searchParams.set("ll", `${lat.toFixed(6)},${lng.toFixed(6)}`);
  url.searchParams.set("limit", "1");
  url.searchParams.set("radius", "80");
  
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: FSQ_KEY, Accept: "application/json" },
      signal: ctrl.signal
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.results?.[0] ?? null;
  } catch { 
    return null; 
  } finally { 
    clearTimeout(timer); 
  }
}

// Enhanced mapping with vibe affinities
function mapCategories(googleTypes: string[] = [], fsqCats: string[] = []): { 
  type: VenueType, 
  energy: number, 
  vibes: VenueClassResult["vibes"] 
} {
  const all = [...googleTypes, ...fsqCats].map(s => s.toLowerCase());
  const has = (s: string) => all.some(x => x.includes(s));

  if (has("night_club") || has("nightclub") || has("dance club")) 
    return { type: "nightclub", energy: 0.9, vibes: { hype: 0.6, energetic: 0.4, social: 0.5 } };
  if (has("bar") || has("pub") || has("brewery") || has("lounge")) 
    return { type: "bar", energy: 0.7, vibes: { social: 0.5, hype: 0.2, chill: 0.3 } };
  if (has("cafe") || has("coffee")) 
    return { type: "coffee", energy: 0.6, vibes: { focused: 0.3, chill: 0.2, social: 0.2, curious: 0.1 } };
  if (has("gym") || has("fitness")) 
    return { type: "gym", energy: 0.8, vibes: { energetic: 0.5, flowing: 0.2, focused: 0.2 } };
  if (has("park") || has("outdoor") || has("recreation")) 
    return { type: "park", energy: 0.4, vibes: { chill: 0.3, flowing: 0.2, open: 0.2 } };
  if (has("office") || has("cowork") || has("company")) 
    return { type: "office", energy: 0.5, vibes: { focused: 0.4, solo: 0.2 } };
  if (has("restaurant") || has("meal_takeaway") || has("meal_delivery")) 
    return { type: "restaurant", energy: 0.6, vibes: { social: 0.25, romantic: 0.15, open: 0.1 } };
  
  return { type: "general", energy: 0.5, vibes: {} };
}

// Improved popularity derivation
function derivePopularity(rating?: number, count?: number): number {
  if (!rating || !count) return 0;
  // Bias toward 4.3+ and 100+ ratings, soft cap
  const r = Math.max(0, (rating - 4.0) / 1.0); // 0..1 when rating=5
  const c = Math.min(1, Math.log10(Math.max(1, count)) / 3); // ~0..1 by 1k ratings
  return Math.min(1, 0.6 * r + 0.4 * c);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, includeRaw = false } = await req.json().catch(() => ({}));
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "lat/lng required" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const key = gridKey(lat, lng);

    // Query Google + FSQ (parallel for speed)
    const [g, f] = await Promise.all([googleNear(lat, lng), fsqNear(lat, lng)]);

    // Normalize field names to avoid Google/FSQ mismatches
    const googleTypes: string[] = g?.types ?? [];
    const fsqCats: string[] = (f?.categories ?? []).map((c: any) => c.name).filter(Boolean);
    const openNow = g?.opening_hours?.open_now ?? undefined;
    const rating = g?.rating ?? undefined;
    const ratingCount = g?.user_ratings_total ?? undefined; // Normalized field name
    const venueName = g?.name ?? f?.name ?? undefined;

    const mapped = mapCategories(googleTypes, fsqCats);
    const popularity = derivePopularity(rating, ratingCount);

    const result: VenueClassResult = {
      type: mapped.type,
      energyBase: mapped.energy,
      openNow,
      rating,
      ratingCount,
      popularity,
      vibes: mapped.vibes,
      categories: includeRaw ? [...googleTypes, ...fsqCats] : [], // Dev only
      name: venueName,
    };

    // TTL: 5 min standard, can be extended for 429 handling
    return new Response(JSON.stringify({ key, ttl: 300, result }), {
      headers: { 
        ...corsHeaders,
        "content-type": "application/json",
        "cache-control": "public, max-age=300"
      }
    });

  } catch (e) {
    console.error('[places-classify] Error:', e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { 
      status: 500,
      headers: corsHeaders
    });
  }
});