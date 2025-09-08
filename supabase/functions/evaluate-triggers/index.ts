// supabase/functions/evaluate-triggers/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TriggerConfig = {
  waitMinutes?: number;
  lateCount?: number;
  rainProbPct?: number;
  budgetHardCap?: number;
  crowdLevel?: number;
};

type ReqBody = {
  plan_id: string;
  active_path_id: "A" | "B" | "C";
  candidate_paths: { A: string; B?: string|null; C?: string|null };
  trigger_rules: TriggerConfig; 
  context: {
    center?: { lat: number; lng: number };
    weather?: { rainProbPct?: number } | null;
    nowISO: string;
  }
};

function omegaSpread(probabilities: number[]) {
  // ω_G = Q90 - Q10 on per-person show-probabilities
  const sorted = [...probabilities].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length-1, Math.max(0, Math.floor(p*(sorted.length-1))))];
  return q(0.9) - q(0.1);
}

function infoGainProxy(independentEntropy: number, jointEntropy: number) {
  // P_G ~ entropy drop
  return Math.max(0, independentEntropy - jointEntropy);
}

function entropyOf(prob: number[]) {
  // simple discrete entropy
  const clamp = (x:number)=>Math.min(0.999,Math.max(0.001,x));
  return -prob.reduce((acc,p)=>acc + (clamp(p)*Math.log2(clamp(p)) + (1-clamp(p))*Math.log2(clamp(1-p))), 0) / prob.length;
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
    const { plan_id, active_path_id, candidate_paths, trigger_rules, context } = await req.json() as ReqBody;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: auth } },
      }
    );

    // 1) RSVP → per-person show probabilities (MVP mapping)
    const { data: rsvps, error } = await supabase
      .from("plan_participants")
      .select("rsvp_status")
      .eq("plan_id", plan_id);
    
    if (error) throw error;

    const pShow = (s: string) => s === "accepted" ? 0.9 : s === "maybe" ? 0.5 : s === "pending" ? 0.3 : 0.05;
    const probs = (rsvps ?? []).map(r => pShow(r.rsvp_status ?? "pending"));
    const omega_G = omegaSpread(probs); // 0 best → 0.85+ very wide
    const H_ind = entropyOf(probs);
    const H_joint = 0.75 * H_ind; // MVP proxy: joint coordination reduces entropy ~25%
    const P_G = infoGainProxy(H_ind, H_joint); // higher is better

    // 2) Read live-ish venue signals
    const getCrowd = async (): Promise<number> => {
      // Use trending venues as proxy for crowd levels
      const { data } = await supabase
        .from("v_trending_venues_enriched")
        .select("trend_score")
        .limit(1);
      const t = (data?.[0]?.trend_score ?? 0);
      return Math.max(0, Math.min(100, Number(t)));
    };
    const crowd = await getCrowd();

    // Weather trigger (client provides prob; we avoid external calls)
    const rainProb = context?.weather?.rainProbPct ?? 0;

    // 3) Trigger evaluation
    const reasons: string[] = [];
    let shouldSwitch = false;
    
    if (trigger_rules.crowdLevel !== undefined && crowd > trigger_rules.crowdLevel) {
      reasons.push(`Crowd ${crowd}% > ${trigger_rules.crowdLevel}%`);
      shouldSwitch = true;
    }
    if (trigger_rules.rainProbPct !== undefined && rainProb > trigger_rules.rainProbPct) {
      reasons.push(`Rain ${rainProb}% > ${trigger_rules.rainProbPct}%`);
      shouldSwitch = true;
    }

    // 4) Predictability gate (parameters can be tuned server-side)
    const OMEGA_MAX = 0.55;  // allow only if spread not too wide
    const TAU_MIN   = 0.10;  // require some info gain
    const gatePass  = omega_G <= OMEGA_MAX && P_G >= TAU_MIN;

    // Decision
    const nextPath = (shouldSwitch && (candidate_paths.B || candidate_paths.C)) 
      ? (candidate_paths.B ?? candidate_paths.C) 
      : active_path_id;
    const action = (shouldSwitch && gatePass && nextPath !== active_path_id) ? "SWITCH" : "STAY";

    // 5) Emit minimal "group receipt" for future audit trail
    const receipt = {
      event_type: "GROUP_SIMULATE",
      plan_id,
      omega_G,
      P_G,
      crowd,
      rainProb,
      decision: action,
      nextPath,
      reasons,
      policy_version: "mvp-2025-09",
      created_at: new Date().toISOString()
    };

    return Response.json(
      { 
        gatePass, 
        omega_G, 
        P_G, 
        crowd, 
        rainProb, 
        decision: action, 
        nextPath, 
        reasons, 
        receipt 
      },
      { headers: corsHeaders }
    );
  } catch (e) {
    console.error("Evaluate triggers error:", e);
    return Response.json(
      { error: String(e?.message ?? e) },
      { status: 500, headers: corsHeaders }
    );
  }
});