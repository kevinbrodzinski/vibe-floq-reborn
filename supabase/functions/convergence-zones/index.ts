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
function avgRadius(friends: Friend[], c: [number, number]) {
  if (!friends.length) return 0.0012; // ~120m fallback
  let s = 0, n = 0;
  for (const f of friends) { const dx = (f.lng - c[0]); const dy = (f.lat - c[1]); s += Math.hypot(dx, dy); n++; }
  const r = (s / Math.max(1, n)) || 0.0012;
  return Math.min(Math.max(r * 1.2, 0.001), 0.0045); // clamp ~100m..450m
}
function ring(c: [number, number], r: number, n = 36): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    out.push([c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r]);
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

    const c  = centroid(friends);
    const r  = avgRadius(friends, c) * (zoom >= 15 ? 0.9 : 1.1);
    const poly = ring(c, r, 40);
    const prob = Math.max(0.25, Math.min(0.9, 0.3 + 0.1 * Math.log2(1 + friends.length)));
    const vibe = 'mixed'; // you can enrich later from your current vibe

    return okJson({ zones: [{ polygon: poly, prob, vibe }], ttlSec: 120 }, 120);
  } catch (e) {
    return bad(e?.message ?? 'error', 500);
  }
});