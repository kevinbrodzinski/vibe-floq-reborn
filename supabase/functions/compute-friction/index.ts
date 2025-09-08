// supabase/functions/compute-friction/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Stop = { venue_id: string; lat: number; lng: number; eta: string };
type Path = { id: string; label?: string; stops: Stop[]; };

type ReqBody = {
  plan_id: string;
  paths: Path[];
  budget_per_person?: number | null;
};

const EARTH_R = 6371000;

function haversine(a: Stop, b: Stop) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la = toRad(a.lat), lb = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(la)*Math.cos(lb)*Math.sin(dLng/2)**2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const auth = req.headers.get("Authorization") ?? "";
    const body = await req.json() as ReqBody;
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: auth } },
      }
    );

    // Get coordination data via RSVP mix
    const { data: rsvps, error: rsvpErr } = await supabase
      .from("plan_participants")
      .select("rsvp_status")
      .eq("plan_id", body.plan_id);

    if (rsvpErr) throw rsvpErr;

    const counts = { yes: 0, maybe: 0, pending: 0, declined: 0 };
    for (const r of rsvps ?? []) {
      switch (r.rsvp_status) {
        case "accepted": counts.yes++; break;
        case "declined": counts.declined++; break;
        case "maybe": counts.maybe++; break;
        default: counts.pending++; break;
      }
    }
    const total = Math.max(1, counts.yes + counts.maybe + counts.pending + counts.declined);
    const coordination = 1 - ((counts.yes + 0.5 * counts.maybe) / total);

    // For each path, compute logistics/social/financial and aggregate
    const results = [];
    for (const path of body.paths) {
      // Logistics: sum hop distances
      let meters = 0;
      for (let i = 1; i < path.stops.length; i++) {
        meters += haversine(path.stops[i - 1], path.stops[i]);
      }
      // Normalize logistics: 0 for <=800m, 1 for >=6000m
      const logistics = Math.min(1, Math.max(0, (meters - 800) / (6000 - 800)));

      // Financial: compare plan budget to venues' price_level
      const budget = body.budget_per_person ?? null;
      let financial = 0;
      if (budget !== null) {
        // Get price levels for venues in this path
        const ids = path.stops.map(s => s.venue_id);
        const { data: priceRows } = await supabase.from("venues")
          .select("id, price_level")
          .in("id", ids);
        
        // Estimate average cost: $ = $25, $$ = $50, $$$ = $75, $$$$ = $100
        const avgCost = (priceRows ?? []).reduce((acc, v) => {
          const cost = (v.price_level ?? 2) * 25;
          return acc + cost;
        }, 0) / Math.max(1, ids.length);
        
        financial = Math.min(1, avgCost > 0 ? Math.max(0, (avgCost - budget) / Math.max(20, budget)) : 0);
      }

      // Social: encourage 4–8 people sweet spot with low uncertainty
      const social = Math.min(1, 0.15 + 0.5 * (counts.maybe + counts.pending) / total);

      // Overall friction (0 best → 1 worst)
      const friction = (0.30 * coordination) + (0.40 * logistics) + (0.15 * social) + (0.15 * financial);

      results.push({
        path_id: path.id,
        label: path.label ?? "Path",
        meters,
        breakdown: { coordination, logistics, social, financial },
        friction,
        friction_score_pct: Math.round(friction * 100)
      });
    }

    // Return best first
    results.sort((a, b) => a.friction - b.friction);
    
    return Response.json(
      { results },
      { headers: corsHeaders }
    );
  } catch (e) {
    console.error("Compute friction error:", e);
    return Response.json(
      { error: String(e?.message ?? e) },
      { status: 500, headers: corsHeaders }
    );
  }
});