// supabase/functions/social-forecast/index.ts
// POST { t: 'now' | 'p30' | 'p120' | 'historic', range?: 'LastThursday'|'LastMonth'|'LastYear', center? | bbox? | zoom }
// -> { cells:[{key,center,pressure,temperature,humidity,wind}], ttlSec:number }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const okJson = (body: unknown, ttlSec = 300) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${ttlSec}` }
  });
const bad = (msg: string, code = 400) =>
  new Response(JSON.stringify({ error: msg }), { status: code, headers: { ...corsHeaders, 'content-type': 'application/json' } });

type Req = { t: 'now'|'p30'|'p120'|'historic'; range?: string; center?: [number,number]; bbox?: [number,number,number,number]; zoom?: number };

function synthCells(center: [number, number], zoom = 14, bias = 0) {
  const [lng, lat] = center;
  const n = Math.max(8, Math.min(28, Math.round(zoom * 1.2)));
  const out = [];
  for (let i=0;i<n;i++){
    const dx = (i % 6) - 2.5, dy = Math.floor(i/6) - 2.5;
    const c: [number,number] = [lng + dx * 0.003, lat + dy * 0.003];
    const pressure = Math.max(0, Math.min(1, 0.35 + bias + (Math.sin(i*0.37)+1)/6 ));
    const temperature = Math.max(0, Math.min(1, 0.4 + (Math.cos(i*0.22)+1)/7 ));
    const humidity = Math.max(0, Math.min(1, 0.45 + (Math.sin(i*0.11)+1)/8 ));
    const ang = (i / n) * Math.PI * 2;
    const wind: [number,number] = [Math.cos(ang), Math.sin(ang)];
    out.push({ key:`sf:${c[0].toFixed(5)}:${c[1].toFixed(5)}`, center:c, pressure, temperature, humidity, wind });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST')    return bad('POST required', 405);
  try {
    const j = await req.json() as Req;
    const zoom = j.zoom ?? 14;
    const ctr  = j.center ?? (j.bbox ? [ (j.bbox[0]+j.bbox[2])/2, (j.bbox[1]+j.bbox[3])/2 ] as [number,number] : [-118.4695,33.9855] as [number,number]);

    // Try real model via RPC/view if present (user JWT)
    let modelCells: any[] | null = null;
    try {
      const url  = Deno.env.get('SUPABASE_URL')!;
      const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization')! } } });
      // Prefer an RPC if available: get_social_forecast(t, range, center, bbox, zoom)
      const { data, error } = await supabase.rpc('get_social_forecast', {
        t: j.t, range: j.range ?? null, center: ctr, bbox: j.bbox ?? null, zoom
      });
      if (!error && Array.isArray(data) && data.length && data[0]?.center) modelCells = data;
    } catch { /* silently fall back */ }

    let cells = modelCells ?? ((): any[] => {
      let bias = 0; if (j.t === 'p30') bias = 0.05; if (j.t === 'p120') bias = 0.12; if (j.t === 'historic') bias = -0.03;
      return synthCells(ctr, zoom, bias);
    })();

    const insights = (j.t === 'historic' && j.range) ? [`You often converge near the centroid during ${j.range}`] : [];
    return okJson({ cells, insights, ttlSec: 300 }, 300);
  } catch (e) {
    return bad(e?.message ?? 'error', 500);
  }
});