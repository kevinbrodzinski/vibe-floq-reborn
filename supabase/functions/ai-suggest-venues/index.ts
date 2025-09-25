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

  const t0 = performance.now();
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const body = await req.json() as Req;
    const {
      center, when,
      categories = [],
      groupSize = Math.max(1, Math.min(50, body.groupSize ?? 4)),
      radiusM = Math.max(100, Math.min(5000, body.radiusM ?? 2000)),
      limit = Math.max(1, Math.min(100, body.limit ?? 24)),
      maxPriceTier = body.maxPriceTier ?? "$$$"
    } = body;
    if (!center?.lat || !center?.lng || !when) {
      return Response.json({ error: "center{lat,lng} and when required" }, { status:400 });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });

    // Use the new database RPC function for better performance
    const priceLevelMap = { "$": 1, "$$": 2, "$$$": 3, "$$$$": 4 } as const;
    
    const { data: scored, error } = await supabase.rpc("fn_ai_suggest_venues", {
      p_lat: center.lat,
      p_lng: center.lng,
      p_radius_m: radiusM,
      p_max_price_level: priceLevelMap[maxPriceTier] ?? 3,
      p_categories: categories.length ? categories : null,
      p_group_size: groupSize,
      p_when: when,
      p_limit: limit
    });

    if (error) {
      console.error("RPC error, falling back to JS ranking:", error);
      
      // Fallback to original JS-based ranking
      const dLat = radiusM / 111_000;
      const dLng = radiusM / (111_000 * Math.cos(center.lat * Math.PI/180));
      const latMin = center.lat - dLat, latMax = center.lat + dLat;
      const lngMin = center.lng - dLng, lngMax = center.lng + dLng;

      const { data } = await supabase
        .from("venues")
        .select("id,name,lat,lng,photo_url,categories,vibe_score,price_level,popularity")
        .gte("lat", latMin).lte("lat", latMax)
        .gte("lng", lngMin).lte("lng", lngMax)
        .limit(400);
      
      const rows = (data ?? []).map((v:any) => ({
        id: v.id, name: v.name, lat: v.lat, lng: v.lng, photo_url: v.photo_url,
        categories: v.categories, vibe_score: Number.isFinite(v.vibe_score) ? v.vibe_score : 50,
        price_level: v.price_level ?? 2, trend_score: Number(v.popularity ?? 0)
      }));

      const deg2m = (la:number, lo:number) => {
        const dLa = (la - center.lat) * 111_000;
        const dLo = (lo - center.lng) * 111_000 * Math.cos(center.lat * Math.PI/180);
        return Math.sqrt(dLa*dLa + dLo*dLo);
      };

      const maxPrice = PRICE_MAX[maxPriceTier];
      const fallbackScored = rows
        .map((r:any) => {
          const dist = deg2m(r.lat, r.lng);
          const price = r.price_level ?? 2;
          const pricePenalty = Math.max(0, (price - maxPrice)) * 0.6;
          const distPenalty = Math.min(1, dist / radiusM);
          const trendBoost = Math.min(1, (Number(r.trend_score || 0) / 100));
          const score = 0.45*(1 - distPenalty) + 0.35*(trendBoost) + 0.20*(1 - pricePenalty);
          return { ...r, dist_m: Math.round(dist), score };
        })
        .sort((a:any,b:any) => b.score - a.score)
        .slice(0, limit);

      const ms = Math.round(performance.now() - t0);
      console.log(`[ai-suggest-venues] fallback took ${ms}ms for ${fallbackScored.length} venues`);

      return new Response(JSON.stringify({
        venues: fallbackScored.map((v:any) => ({
          id: v.id, name: v.name, photo_url: v.photo_url,
          vibe_score: v.vibe_score, score: Number(v.score?.toFixed(3) ?? 0),
          dist_m: v.dist_m, 
          reasons: [
            v.score > 0.7 ? "Hot right now" : "Solid pick",
            v.dist_m ? `${v.dist_m}m away` : undefined
          ].filter(Boolean)
        }))
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ms = Math.round(performance.now() - t0);
    console.log(`[ai-suggest-venues] RPC took ${ms}ms for ${scored?.length || 0} venues`);

    return new Response(JSON.stringify({
      venues: (scored || []).map((v:any) => ({
        id: v.id, name: v.name, photo_url: v.photo_url,
        vibe_score: v.vibe_score, score: Number(v.score?.toFixed(3) ?? 0),
        dist_m: Math.round(v.dist_m || 0), 
        reasons: v.reasons || [
          v.score > 0.7 ? "Hot right now" : "Solid pick",
          v.dist_m ? `${Math.round(v.dist_m)}m away` : undefined
        ].filter(Boolean)
      }))
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    console.error(`[ai-suggest-venues] error after ${ms}ms:`, e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { 
      status:500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});