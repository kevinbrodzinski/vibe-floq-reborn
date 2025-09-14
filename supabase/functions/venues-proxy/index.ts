// Enhanced Venue Proxy with Rate Limiting, Caching & Intelligent Fusion
// Replaces places-classify with production-grade venue intelligence

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type Provider = "google" | "fsq";

const CFG = {
  GOOGLE_KEY: Deno.env.get("GOOGLE_PLACES_KEY") ?? "",
  FSQ_KEY: Deno.env.get("FSQ_SERVICE_KEY") ?? "",
  // Token bucket per minute
  LIMITS: {
    google: { capacity: 30, refillPerSec: 30/60 }, // ~30/min
    fsq:    { capacity: 20, refillPerSec: 20/60 }, // ~20/min
  },
  // Caches
  SERVER_TTL_MS: 60_000, // 60s hot cache on server
  CLIENT_TTL_S: 300,     // advise client to cache 5m
};

type Bucket = { tokens: number; last: number };
const buckets: Record<Provider, Bucket> = {
  google: { tokens: CFG.LIMITS.google.capacity, last: Date.now() },
  fsq:    { tokens: CFG.LIMITS.fsq.capacity,    last: Date.now() },
};

function take(provider: Provider): boolean {
  const now = Date.now();
  const b = buckets[provider];
  const lim = CFG.LIMITS[provider];
  // Refill since last
  const elapsed = (now - b.last) / 1000;
  b.tokens = Math.min(lim.capacity, b.tokens + elapsed * lim.refillPerSec);
  b.last = now;
  if (b.tokens >= 1) { b.tokens -= 1; return true; }
  return false;
}

const memCache = new Map<string, { t: number, value: any }>();

function memo(key: string, ttlMs: number, getter: () => Promise<any>) {
  const hit = memCache.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return Promise.resolve(hit.value);
  return getter().then(v => (memCache.set(key, { t: Date.now(), value: v }), v));
}

async function backoffFetch(url: string, init: RequestInit, tries = 3): Promise<Response> {
  let delay = 250;
  for (let i=0;i<tries;i++) {
    const res = await fetch(url, init);
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      await new Promise(r => setTimeout(r, delay + Math.random()*100));
      delay *= 2;
      continue;
    }
    return res;
  }
  return new Response(null, { status: 503 });
}

async function callGoogle(lat: number, lng: number) {
  if (!CFG.GOOGLE_KEY) return null;
  if (!take("google")) return { rateLimited: true };
  
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("rankby", "distance");
  url.searchParams.set("type", "establishment");
  url.searchParams.set("key", CFG.GOOGLE_KEY);
  
  const res = await backoffFetch(url.toString(), {});
  if (!res.ok) return null;
  
  const j = await res.json();
  const first = j.results?.[0];
  if (!first) return null;
  
  return {
    provider: "google",
    name: first.name,
    types: first.types ?? [],
    rating: first.rating,
    userRatings: first.user_ratings_total,
    openNow: first.opening_hours?.open_now,
  };
}

async function callFSQ(lat: number, lng: number) {
  if (!CFG.FSQ_KEY) return null;
  if (!take("fsq")) return { rateLimited: true };
  
  const url = new URL("https://api.foursquare.com/v3/places/search");
  url.searchParams.set("ll", `${lat.toFixed(6)},${lng.toFixed(6)}`);
  url.searchParams.set("radius", "80");
  url.searchParams.set("limit", "1");
  
  const res = await backoffFetch(url.toString(), {
    headers: { Authorization: CFG.FSQ_KEY, Accept: "application/json" }
  });
  if (!res.ok) return null;
  
  const j = await res.json();
  const first = j.results?.[0];
  if (!first) return null;
  
  return {
    provider: "fsq",
    name: first.name,
    types: (first.categories ?? []).map((c: any) => c.name).filter(Boolean),
    rating: first.rating,
    userRatings: first.popularity ?? undefined,
  };
}

function fuse(a: any, b: any) {
  // Keep source with strongest signal (rating + user count heuristic)
  const score = (x: any) =>
    (typeof x?.rating === "number" ? x.rating : 0) +
    (typeof x?.userRatings === "number" ? Math.min(1, Math.log10(1 + x.userRatings)/3) : 0);
  
  const best = score(a) >= score(b) ? a : b;
  const other = best === a ? b : a;
  
  return {
    name: best?.name ?? other?.name,
    categories: [...new Set([...(best?.types ?? []), ...(other?.types ?? [])])],
    confidence: Math.min(1, (score(best) + score(other))/10),
    providers: [a?.provider, b?.provider].filter(Boolean),
    rating: best?.rating ?? other?.rating,
    userRatings: best?.userRatings ?? other?.userRatings,
    openNow: best?.openNow ?? other?.openNow,
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { lat, lng, gridKey } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "lat/lng required" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const cacheKey = `venue:${gridKey ?? `${lat.toFixed(4)},${lng.toFixed(4)}`}`;
    
    const payload = await memo(cacheKey, CFG.SERVER_TTL_MS, async () => {
      const [g, f] = await Promise.allSettled([callGoogle(lat, lng), callFSQ(lat, lng)]);
      const a = g.status === "fulfilled" ? g.value : null;
      const b = f.status === "fulfilled" ? f.value : null;
      
      let out = null;
      if (a && b) out = fuse(a, b);
      else out = a ?? b ?? { name: null, categories: [], confidence: 0, providers: [] };
      
      return out;
    });

    const headers = {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${CFG.CLIENT_TTL_S}`,
    };
    
    return new Response(JSON.stringify({ venue: payload }), { headers });
  } catch (e) {
    console.error('[venues-proxy] Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
