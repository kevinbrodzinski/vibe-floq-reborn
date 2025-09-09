// Deno Edge Function: social-weather
// Input: { bbox|center+radius, zoom }
// Output: { cells: PressureCell[], ttlSec }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function okJson(body: unknown, ttlSec = 300) {
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

// Simple grid sampler (replace with H3 & your DB)
function cellsFor(center: [number, number], zoom: number) {
  const [lng, lat] = center;
  const n = Math.max(6, Math.min(24, Math.round(zoom * 1.5)));
  const out = [];
  
  for (let i = 0; i < n; i++) {
    const dx = (i % 6) - 2.5;
    const dy = Math.floor(i / 6) - 2.5;
    const c: [number, number] = [lng + dx * 0.003, lat + dy * 0.003];
    const pressure = Math.max(0, Math.min(1, Math.random() * 0.7 + 0.2));
    const temperature = Math.max(0, Math.min(1, Math.random() * 0.6 + 0.2));
    const humidity = Math.max(0, Math.min(1, Math.random() * 0.5 + 0.3));
    const angle = (i / n) * Math.PI * 2;
    const wind: [number, number] = [Math.cos(angle), Math.sin(angle)];
    
    out.push({
      key: `sw:${c[0].toFixed(5)}:${c[1].toFixed(5)}`,
      center: c,
      pressure, 
      temperature, 
      humidity, 
      wind
    });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return bad("POST required", 405);
    
    const { bbox, center, radius, zoom = 14 } = await req.json();
    const ctr = center ?? (bbox ? [ (bbox[0]+bbox[2])/2, (bbox[1]+bbox[3])/2 ] as [number,number] : [-118.4695,33.9855] as [number,number]);

    const cells = cellsFor(ctr, zoom);
    const body = { cells, ttlSec: 300 };
    
    return okJson(body, body.ttlSec);
  } catch (e) {
    console.error('[social-weather] error:', e);
    return bad(e?.message ?? "unknown error", 500);
  }
});