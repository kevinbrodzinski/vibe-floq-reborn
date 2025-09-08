// supabase/functions/evaluate-triggers/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type TriggerConfig = { waitMinutes?: number; lateCount?: number; rainProbPct?: number; budgetHardCap?: number; crowdLevel?: number; };
type ReqBody = {
  plan_id: string;
  active_path_id: "A"|"B"|"C";
  candidate_paths: { A: string; B?: string|null; C?: string|null };
  trigger_rules: TriggerConfig;
  context: { weather?: { rainProbPct?: number }|null; nowISO: string };
};

const clamp01 = (x:number)=>Math.min(1,Math.max(0,x));
const entropy = (p:number[])=>{
  const c=(x:number)=>Math.min(0.999,Math.max(0.001,x));
  return -p.reduce((a,v)=>a+(c(v)*Math.log2(c(v)) + c(1-v)*Math.log2(c(1-v))),0)/p.length;
};
const omegaSpread = (p:number[])=>{ const s=[...p].sort((a,b)=>a-b); const q=(t:number)=>s[Math.min(s.length-1,Math.floor(t*(s.length-1)))]; return q(0.9)-q(0.1); };

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
    const { plan_id, active_path_id, candidate_paths, trigger_rules, context } = await req.json() as ReqBody;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global:{ headers:{ Authorization:auth } } });

    const { data: rsvps } = await supabase.from("plan_participants").select("rsvp_status").eq("plan_id", plan_id);
    const toP = (s:string)=> s==="accepted"?0.9 : s==="maybe"?0.5 : s==="pending"?0.3 : 0.05;
    const probs = (rsvps??[]).map((r:any)=>toP(r.rsvp_status ?? "pending"));
    const omega_G = omegaSpread(probs); // lower = tighter
    const H_ind = entropy(probs);
    const P_G = Math.max(0, H_ind - 0.75*H_ind); // MVP proxy

    // crowd proxy from trending view
    const { data: tv } = await supabase.from("v_trending_venues_enriched").select("trend_score").limit(1);
    const crowd = Number(tv?.[0]?.trend_score ?? 0);
    const rainProb = Number(context?.weather?.rainProbPct ?? 0);

    let shouldSwitch = false;
    const reasons:string[] = [];
    if (trigger_rules.crowdLevel!==undefined && crowd > trigger_rules.crowdLevel) { shouldSwitch=true; reasons.push(`Crowd ${crowd}% > ${trigger_rules.crowdLevel}%`); }
    if (trigger_rules.rainProbPct!==undefined && rainProb > trigger_rules.rainProbPct) { shouldSwitch=true; reasons.push(`Rain ${rainProb}% > ${trigger_rules.rainProbPct}%`); }

    const OMEGA_MAX=0.55, TAU_MIN=0.10;
    const gatePass = (omega_G<=OMEGA_MAX) && (P_G>=TAU_MIN);

    const nextPath = (shouldSwitch && (candidate_paths.B || candidate_paths.C)) ? (candidate_paths.B ?? candidate_paths.C)! : active_path_id;
    const action = (shouldSwitch && gatePass && nextPath!==active_path_id) ? "SWITCH" : "STAY";

    // Hysteresis: skip suggestion if we emitted a SWITCH_* in last 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("group_receipts")
      .select("event_type, created_at")
      .eq("plan_id", plan_id)
      .gte("created_at", tenMinAgo)
      .in("event_type", ["SWITCH_SUGGESTED","SWITCH_ACCEPTED","SWITCH_REJECTED"])
      .limit(1);

    const finalDecision = (recent?.length && action === "SWITCH") ? "STAY" : action;

    // Persist receipt
    try {
      await supabase.from("group_receipts").insert({
        plan_id,
        event_type: finalDecision === "SWITCH" ? "SWITCH_SUGGESTED" : "GROUP_SIMULATE",
        payload: { omega_G, P_G, crowd, rainProb, nextPath, reasons, policy_version: "mvp-2025-09" }
      });
    } catch (e) {
      console.warn('[group_receipts] insert failed:', e);
    }

    return new Response(JSON.stringify({ 
      gatePass, omega_G, P_G, crowd, rainProb, 
      decision: finalDecision, nextPath, reasons
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { 
      status:500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});