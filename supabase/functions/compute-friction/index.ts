// supabase/functions/compute-friction/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Stop = { venue_id: string; lat: number; lng: number; eta: string };
type Path = { id: string; label?: string; stops: Stop[]; };
type ReqBody = { plan_id: string; paths: Path[]; budget_per_person?: number|null; };

const EARTH_R = 6371000;
const toRad = (d:number)=>d*Math.PI/180;
const hav = (a:Stop,b:Stop)=>2*EARTH_R*Math.asin(Math.sqrt(
  Math.sin((toRad(b.lat-a.lat))/2)**2 +
  Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin((toRad(b.lng-a.lng))/2)**2
));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method!=="POST") return new Response("Method Not Allowed",{status:405, headers: corsHeaders});
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const body = await req.json() as ReqBody;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });

    const { data: rsvps } = await supabase.from("plan_participants").select("rsvp_status").eq("plan_id", body.plan_id);
    const counts = { yes:0, maybe:0, pending:0, declined:0 };
    for (const r of rsvps ?? []) {
      const s = (r as any).rsvp_status ?? "pending";
      if (s==="accepted") counts.yes++; else if (s==="maybe") counts.maybe++; else if (s==="declined") counts.declined++; else counts.pending++;
    }
    const total = Math.max(1, counts.yes+counts.maybe+counts.pending+counts.declined);
    const coordination = 1 - ((counts.yes + 0.5*counts.maybe)/total); // 0 good → 1 bad

    // Prefetch all venue prices to avoid N queries per path
    const allVenueIds = Array.from(new Set(
      body.paths.flatMap(p => p.stops.map(s => s.venue_id))
    ));
    const { data: priceRows } = await supabase
      .from("venues")
      .select("id, price_level")
      .in("id", allVenueIds);
    const priceMap = new Map((priceRows ?? []).map(r => [r.id, r.price_level ?? 2]));

    const results:any[] = [];
    for (const path of body.paths) {
      let meters = 0;
      for (let i=1;i<path.stops.length;i++) meters += hav(path.stops[i-1], path.stops[i]);
      const logistics = Math.min(1, Math.max(0, (meters-800)/(6000-800)));

      let financial = 0;
      const budget = body.budget_per_person ?? null;
      if (budget !== null) {
        const avg = path.stops.reduce((acc, s) => acc + (priceMap.get(s.venue_id) ?? 2) * 30, 0) / Math.max(1, path.stops.length);
        financial = Math.min(1, avg > 0 ? Math.max(0, (avg - budget) / Math.max(20, budget)) : 0);
      }

      const social = Math.min(1, 0.15 + 0.5 * (counts.maybe + counts.pending) / total);
      const friction = 0.30*coordination + 0.40*logistics + 0.15*social + 0.15*financial;

      results.push({
        path_id: path.id, label: path.label ?? "Path",
        meters, breakdown: { coordination, logistics, social, financial },
        friction, friction_score_pct: Math.round(friction*100)
      });
    }
    results.sort((a,b)=>a.friction-b.friction);
    return new Response(JSON.stringify({ results }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { 
      status:500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});