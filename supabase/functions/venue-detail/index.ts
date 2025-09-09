// Deno Edge Function: venue-detail
// Input: { pid: string }  (Google place_id)
// Output: { venue: VenueDetail, ttlSec }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GOOGLE_KEY = Deno.env.get("GOOGLE_PLACES_KEY");

function okJson(body: unknown, ttlSec = 900) {
  return new Response(JSON.stringify(body), {
    headers: { 
      ...corsHeaders,
      "content-type": "application/json", 
      "cache-control": `public, max-age=${ttlSec}` 
    }
  });
}

function bad(msg: string, code = 400) {
  return new Response(JSON.stringify({ error: msg }), { 
    status: code, 
    headers: { ...corsHeaders, "content-type": "application/json" } 
  });
}

async function googleDetails(pid: string) {
  if (!GOOGLE_KEY) return null;
  
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", pid);
  url.searchParams.set("fields", "place_id,name,formatted_address,formatted_phone_number,opening_hours,price_level,rating,photos,geometry");
  url.searchParams.set("key", GOOGLE_KEY);
  
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  return j.result ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!GOOGLE_KEY) return bad('GOOGLE_PLACES_KEY missing', 500);

  try {
    if (req.method !== "POST") return bad("POST required", 405);
    
    const { pid } = await req.json();
    if (!pid) return bad("Missing pid");

    const gd = await googleDetails(pid);
    if (!gd) return bad("not found", 404);

    const photoUrls: string[] = Array.isArray(gd.photos) && GOOGLE_KEY
      ? gd.photos.slice(0, 6).map((ph: any) =>
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1280&photo_reference=${ph.photo_reference}&key=${GOOGLE_KEY}`
        )
      : [];

    const venue = {
      pid: gd.place_id,
      name: gd.name,
      address: gd.formatted_address ?? undefined,
      phone: gd.formatted_phone_number ?? undefined,
      photos: photoUrls,
      rating: gd.rating ?? undefined,
      price: gd.price_level ?? undefined,
      hours: gd.opening_hours ?? undefined,
      attributes: {},
      src: ["google"],
      attribution: ["Powered by Google", "© Mapbox"],
    };

    const body = { venue, ttlSec: 900 };
    return okJson(body, body.ttlSec);
  } catch (e) {
    console.error('[venue-detail] error:', e);
    return bad(e?.message ?? "unknown error", 500);
  }
});