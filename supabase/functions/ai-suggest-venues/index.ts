// supabase/functions/ai-suggest-venues/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Req = {
  center: { lat: number; lng: number };
  when: string;                      // ISO
  groupSize?: number;
  maxPriceTier?: "$"|"$$"|"$$$"|"$$$$";
  categories?: string[];
  radiusM?: number;
  limit?: number;
};

const PRICE_MAX = { "$":1, "$$":2, "$$$":3, "$$$$":4 } as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status:405, headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const body = await req.json() as Req;
    const { center, when, categories = [], groupSize = 4, radiusM = 2000, limit = 24, maxPriceTier = "$$$" } = body;
    if (!center?.lat || !center?.lng || !when) {
      return Response.json({ error: "center{lat,lng} and when required" }, { status:400 });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });

    // crude bbox around center
    const dLat = radiusM / 111_000; // ~meters->deg
    const dLng = radiusM / (111_000 * Math.cos(center.lat * Math.PI/180));
    const latMin = center.lat - dLat, latMax = center.lat + dLat;
    const lngMin = center.lng - dLng, lngMax = center.lng + dLng;

    // try enriched trending view first
    let rows: any[] = [];
    {
      const q = supabase
        .from("v_trending_venues_enriched")
        .select("venue_id,name,provider,categories,photo_url,vibe_tag,vibe_score,live_count,trend_score")
        .gte("vibe_score", 0)
        .limit(200);
      const { data, error } = await q;
      if (!error && data) rows = data.map((r:any) => ({
        id: r.venue_id, name: r.name, categories: r.categories, photo_url: r.photo_url,
        vibe_score: r.vibe_score ?? 50, live_count: r.live_count ?? 0, trend_score: Number(r.trend_score ?? 0)
      }));
    }

    // fallback to venues if enriched view is empty
    if (!rows.length) {
      const { data } = await supabase
        .from("venues")
        .select("id,name,lat,lng,photo_url,categories,vibe_score,price_level,popularity")
        .gte("lat", latMin).lte("lat", latMax)
        .gte("lng", lngMin).lte("lng", lngMax)
        .limit(400);
      rows = (data ?? []).map((v:any) => ({
        id: v.id, name: v.name, lat: v.lat, lng: v.lng, photo_url: v.photo_url,
        categories: v.categories, vibe_score: v.vibe_score ?? 50,
        price_level: v.price_level ?? 2, trend_score: Number(v.popularity ?? 0)
      }));
    }

    // score: distance + trend + price fit
    const deg2m = (la:number, lo:number) => {
      const dLa = (la - center.lat) * 111_000;
      const dLo = (lo - center.lng) * 111_000 * Math.cos(center.lat * Math.PI/180);
      return Math.sqrt(dLa*dLa + dLo*dLo);
    };
    const maxPrice = PRICE_MAX[maxPriceTier];
    const scored = rows
      .map((r:any) => {
        const dist = (typeof r.lat === "number" && typeof r.lng === "number") ? deg2m(r.lat, r.lng) : radiusM*2;
        const price = typeof r.price_level === "number" ? r.price_level : 2;
        const pricePenalty = Math.max(0, (price - maxPrice)) * 0.6;
        const distPenalty = Math.min(1, dist / radiusM);
        const trendBoost = Math.min(1, (Number(r.trend_score || 0) / 100));
        const score = 0.45*(1 - distPenalty) + 0.35*(trendBoost) + 0.20*(1 - pricePenalty);
        return { ...r, dist, score };
      })
      .sort((a:any,b:any) => b.score - a.score)
      .slice(0, limit);

    return new Response(JSON.stringify({
      venues: scored.map((v:any) => ({
        id: v.id, name: v.name, photo_url: v.photo_url,
        vibe_score: v.vibe_score, score: Number(v.score?.toFixed(3) ?? 0),
        dist_m: Math.round(v.dist || 0), reasons: [
          v.score > 0.7 ? "Hot right now" : "Solid pick",
          v.dist ? `${Math.round(v.dist)}m away` : undefined
        ].filter(Boolean)
      }))
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { 
      status:500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});