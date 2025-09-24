// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Server-only gate
const TRAIN_SECRET = Deno.env.get("TRAIN_USER_MODEL_SECRET")!;
const supa = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

type Weights = {
  w_distance: number; w_rating: number; w_popularity: number;
  w_tag_match: number; w_cuisine_match: number; w_price_fit: number; bias: number;
};

const DEFAULT_W: Weights = {
  w_distance: 0.25, w_rating: 0.20, w_popularity: 0.20,
  w_tag_match: 0.15, w_cuisine_match: 0.10, w_price_fit: 0.10, bias: 0
};

function sigmoid(z: number){ return 1/(1+Math.exp(-z)); }

function trainLogReg(X: number[][], y: number[], w0: Weights, opts?: {lr?:number, l2?:number, iters?:number}) {
  const lr = opts?.lr ?? 0.1;
  const l2 = opts?.l2 ?? 0.01;
  const it = opts?.iters ?? 300;

  // order: [c_distance, c_rating, c_popularity, c_tag_match, c_cuisine_match, c_price_fit, bias]
  let w = [
    w0.w_distance, w0.w_rating, w0.w_popularity, w0.w_tag_match, w0.w_cuisine_match, w0.w_price_fit, w0.bias
  ];

  for (let t=0; t<it; t++){
    let g = new Array(w.length).fill(0);
    for (let i=0; i<X.length; i++){
      const xi = X[i], yi = y[i];
      let z = 0; for (let k=0;k<6;k++) z += w[k]*xi[k];
      z += w[6]; // bias
      const p = sigmoid(z);
      const err = (p - yi);
      for (let k=0;k<6;k++) g[k] += err * xi[k];
      g[6] += err; // bias
    }
    // L2 ridge (no penalty on bias)
    for (let k=0;k<6;k++) g[k] += l2 * w[k];

    // step
    for (let k=0;k<w.length;k++) w[k] -= lr * (g[k] / Math.max(1, X.length));
  }

  return {
    w_distance: w[0], w_rating: w[1], w_popularity: w[2],
    w_tag_match: w[3], w_cuisine_match: w[4], w_price_fit: w[5], bias: w[6]
  } as Weights;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!TRAIN_SECRET || req.headers.get("x-train-secret") !== TRAIN_SECRET) {
      return new Response(JSON.stringify({ ok:false, error:"Unauthorized" }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const { profile_id, lookback_days = 60, top_k = 10, engage_window_min = 90, min_samples = 60, lr = 0.15, l2 = 0.02, iters = 350 } = await req.json();

    if (!profile_id) return new Response(JSON.stringify({ ok:false, error:"profile_id required" }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    // Pull recent events
    const { data: events, error: evErr } = await supa
      .from("recommendation_events")
      .select("id, created_at, context, candidate_ids")
      .eq("profile_id", profile_id)
      .gte("created_at", new Date(Date.now() - lookback_days*24*3600*1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(200);
    if (evErr) throw evErr;
    if (!events?.length) return new Response(JSON.stringify({ ok:true, skipped:"no_events" }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    // Pull tastes once
    const { data: tastes, error: tErr } = await supa
      .from("user_tastes")
      .select("preferred_cuisines, price_min, price_max")
      .eq("profile_id", profile_id).maybeSingle();
    if (tErr) throw tErr;

    const X: number[][] = [];
    const y: number[] = [];

    // For each event, compute features for top_k candidates via SQL (re-using your scoring components)
    for (const ev of events) {
      const ctx = (ev.context || {}) as any;
      const lat = ctx.lat ?? ctx.latitude;
      const lng = ctx.lng ?? ctx.longitude;
      const radius_m = ctx.radius_m ?? 3000;
      const tz = ctx.tz ?? "America/Los_Angeles";
      const vibe = ctx.vibe ?? null;
      const tags = Array.isArray(ctx.tags) ? ctx.tags : null;
      const candidates: string[] = (ev.candidate_ids || []).slice(0, top_k);

      if (!lat || !lng || !candidates.length) continue;

      const { data: rows, error: featErr } = await supa.rpc("train_user_features", {
        p_profile_id: profile_id,
        p_lat: lat, p_lng: lng, p_radius_m: radius_m,
        p_now: ev.created_at,
        p_vibe: vibe, p_tags: tags,
        p_tz: tz,
        p_candidate_ids: candidates,
        p_engage_window_min: engage_window_min
      });
      if (featErr) throw featErr;

      for (const r of (rows ?? [])) {
        // r: {c_distance,c_rating,c_popularity,c_tag_match,c_cuisine_match,c_price_fit, engaged}
        X.push([r.c_distance, r.c_rating, r.c_popularity, r.c_tag_match, r.c_cuisine_match, r.c_price_fit]);
        y.push(r.engaged ? 1 : 0);
      }
    }

    if (X.length < min_samples) {
      return new Response(JSON.stringify({ ok:true, skipped:"insufficient_samples", samples:X.length }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Start from defaults
    const w = trainLogReg(X, y, DEFAULT_W, { lr, l2, iters });

    // Save to user_tastes
    const { error: upErr } = await supa
      .from("user_tastes")
      .update({ model_weights: w as any, model_updated_at: new Date().toISOString() })
      .eq("profile_id", profile_id);
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok:true, weights:w, samples:X.length }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});