// supabase/functions/compute-friction/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Stop = { venue_id: string; lat: number; lng: number; eta: string };
type Path = { id: string; label?: string; stops: Stop[]; };
type ReqBody = { plan_id: string; paths: Path[]; budget_per_person?: number|null; };

// Legacy constants (now handled in SQL)

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
    
    // Validate payload size
    if (!Array.isArray(body.paths) || body.paths.length === 0 || body.paths.length > 6) {
      return new Response(JSON.stringify({ error: "Invalid paths (1–6 allowed)" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    for (const p of body.paths) {
      if (!Array.isArray(p.stops) || p.stops.length === 0 || p.stops.length > 10) {
        return new Response(JSON.stringify({ error: "Each path must have 1–10 stops" }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });

    // Use the SQL RPC function for friction calculation
    const { data, error } = await supabase.rpc('fn_compute_friction', {
      p_plan_id: body.plan_id,
      p_paths_json: body.paths,
      p_budget_per_person: body.budget_per_person ?? null
    });

    if (error) {
      console.error('[compute-friction] RPC error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ results: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { 
      status:500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});