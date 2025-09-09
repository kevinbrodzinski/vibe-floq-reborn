// supabase/functions/convergence-zones/index.ts
// POST { friends:[{lng,lat,weight?}], center?, bbox?, zoom:number }
// -> { zones:[{ polygon:[ [lng,lat]... ], prob:number, vibe:string }], ttlSec:number }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const okJson = (body: unknown, ttlSec = 120) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${ttlSec}` }
  });
const bad = (msg: string, code = 400) =>
  new Response(JSON.stringify({ error: msg }), { status: code, headers: { ...corsHeaders, 'content-type': 'application/json' } });

type Friend = { lng: number; lat: number; weight?: number };

function centroid(friends: Friend[]): [number, number] {
  let sx = 0, sy = 0, sw = 0;
  for (const f of friends) { const w = Math.max(0.1, f.weight ?? 1); sx += f.lng * w; sy += f.lat * w; sw += w; }
  return sw ? [sx / sw, sy / sw] : [0, 0];
}

function avgRadiusMeters(friends: Friend[], c: [number,number]) {
  if (!friends.length) return 120; // meters
  const R = 6371000; // Earth radius
  const [lng0, lat0] = c.map(x => x * Math.PI/180);
  let s=0, n=0;
  for (const f of friends) {
    const lng = f.lng * Math.PI/180, lat = f.lat * Math.PI/180;
    const d = 2*R*Math.asin(Math.sqrt(
      Math.sin((lat-lat0)/2)**2 +
      Math.cos(lat0)*Math.cos(lat)*Math.sin((lng-lng0)/2)**2
    ));
    s += d; n++;
  }
  return s/Math.max(1,n);
}

function metersToDegrees(m: number, atLatDeg: number) {
  const latRad = atLatDeg * Math.PI/180;
  const degLat = m / 111320;
  const degLng = m / (111320 * Math.cos(latRad));
  return { degLat, degLng };
}
function ring(c: [number, number], radiusMeters: number, atLatDeg: number, n = 36): [number, number][] {
  const { degLat, degLng } = metersToDegrees(radiusMeters, atLatDeg);
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    out.push([c[0] + Math.cos(t) * degLng, c[1] + Math.sin(t) * degLat]);
  }
  out.push(out[0]);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST')    return bad('POST required', 405);

  try {
    const body = await req.json();
    const friends: Friend[] = Array.isArray(body?.friends) ? body.friends : [];
    const zoom: number = Number(body?.zoom ?? 14);

    if (!friends.length) return okJson({ zones: [], ttlSec: 60 }, 60);

    const c = centroid(friends);
    const radiusMeters = avgRadiusMeters(friends, c) * (zoom >= 15 ? 0.9 : 1.1);
    const poly = ring(c, radiusMeters, c[1], 40);
    const prob = Math.max(0.25, Math.min(0.9, 0.3 + 0.1 * Math.log2(1 + friends.length)));
    const vibe = 'mixed';

    return okJson({ zones: [{ polygon: poly, prob, vibe, centroid: c }], ttlSec: 120 }, 120);
  } catch (e) {
    return bad(e?.message ?? 'error', 500);
  }
});