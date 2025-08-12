// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supa = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service-role, bypass RLS
);

// Reuse training secret or set a new one
const ON_INTERACTION_SECRET = Deno.env.get("TRAIN_USER_MODEL_SECRET")!;

type W = {
  w_distance: number; w_rating: number; w_popularity: number;
  w_tag_match: number; w_cuisine_match: number; w_price_fit: number; bias: number;
};

const DEFAULT_W: W = {
  w_distance: 0.25, w_rating: 0.20, w_popularity: 0.20,
  w_tag_match: 0.15, w_cuisine_match: 0.10, w_price_fit: 0.10, bias: 0,
};

// Small step, light regularization
const LR = Number(Deno.env.get("ONLINE_LR") ?? 0.04);
const L2 = Number(Deno.env.get("ONLINE_L2") ?? 0.02);

function sigmoid(z: number){ return 1/(1+Math.exp(-z)); }
function clamp(v: number, lo: number, hi: number){ return Math.min(hi, Math.max(lo, v)); }
function renorm(w: W): W {
  // keep sum of feature weights in a sane band
  const sum = w.w_distance + w.w_rating + w.w_popularity + w.w_tag_match + w.w_cuisine_match + w.w_price_fit;
  const target = 1.0;
  if (sum < 0.6 || sum > 1.6) {
    const s = target / sum;
    w.w_distance *= s; w.w_rating *= s; w.w_popularity *= s;
    w.w_tag_match *= s; w.w_cuisine_match *= s; w.w_price_fit *= s;
  }
  // avoid negatives
  w.w_distance = clamp(w.w_distance, 0, 1);
  w.w_rating = clamp(w.w_rating, 0, 1);
  w.w_popularity = clamp(w.w_popularity, 0, 1);
  w.w_tag_match = clamp(w.w_tag_match, 0, 1);
  w.w_cuisine_match = clamp(w.w_cuisine_match, 0, 1);
  w.w_price_fit = clamp(w.w_price_fit, 0, 1);
  return w;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!ON_INTERACTION_SECRET || req.headers.get("x-train-secret") !== ON_INTERACTION_SECRET) {
      return new Response(JSON.stringify({ ok:false, error:"Unauthorized" }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const {
      profile_id, venue_id,
      interaction_type,                           // 'tap'|'like'|'bookmark'|'checkin'|'plan'|'dismiss'|'dislike'|'view'
      context = {}                                // { lat,lng,tz,vibe,tags,radius_m, now }
    } = body;

    if (!profile_id || !venue_id || !interaction_type) {
      return new Response(JSON.stringify({ ok:false, error:"missing fields" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1) Persist interaction (use your SQL function if present)
    await supa.rpc("track_interaction", {
      p_profile_id: profile_id,
      p_venue_id: venue_id,
      p_type: interaction_type,
      p_weight: 0, // weight handled elsewhere; model uses binary label
      p_context: context
    });

    // Map interaction -> label y (skip very weak signals)
    const positive = new Set(["like","bookmark","checkin","plan"]);
    const negative = new Set(["dislike","dismiss"]);
    if (!positive.has(interaction_type) && !negative.has(interaction_type)) {
      return new Response(JSON.stringify({ ok:true, skipped:"neutral" }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const y = positive.has(interaction_type) ? 1 : 0;

    // 2) Fetch current weights
    const { data: ut } = await supa
      .from("user_tastes")
      .select("model_weights")
      .eq("profile_id", profile_id)
      .maybeSingle();
    const w0: W = { ...DEFAULT_W, ...(ut?.model_weights ?? {}) };

    // 3) Compute features for this exact context & venue
    const nowIso = context.now || new Date().toISOString();
    const { data: rows, error: featErr } = await supa.rpc("train_user_features", {
      p_profile_id: profile_id,
      p_lat: context.lat, p_lng: context.lng,
      p_radius_m: context.radius_m ?? 3000,
      p_now: nowIso,
      p_vibe: context.vibe ?? null,
      p_tags: Array.isArray(context.tags) ? context.tags : null,
      p_tz: context.tz ?? "America/Los_Angeles",
      p_candidate_ids: [venue_id],
      p_engage_window_min: 90
    });
    if (featErr) throw featErr;
    if (!rows || !rows.length) {
      return new Response(JSON.stringify({ ok:true, skipped:"no_features" }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const r = rows[0];
    const x = [
      Number(r.c_distance) || 0,
      Number(r.c_rating) || 0,
      Number(r.c_popularity) || 0,
      Number(r.c_tag_match) || 0,
      Number(r.c_cuisine_match) || 0,
      Number(r.c_price_fit) || 0,
    ];

    // 4) One SGD step (logistic regression with L2)
    let w = [w0.w_distance, w0.w_rating, w0.w_popularity, w0.w_tag_match, w0.w_cuisine_match, w0.w_price_fit, w0.bias];
    let z = w.slice(0,6).reduce((s, wi, i) => s + wi*x[i], 0) + w[6];
    const p = sigmoid(z);
    const err = p - y;

    const grad = new Array(7).fill(0);
    for (let i=0;i<6;i++) grad[i] = err * x[i] + L2 * w[i]; // L2 on weights only
    grad[6] = err;

    for (let i=0;i<7;i++) w[i] -= LR * grad[i];

    let wNew: W = {
      w_distance: w[0], w_rating: w[1], w_popularity: w[2],
      w_tag_match: w[3], w_cuisine_match: w[4], w_price_fit: w[5], bias: w[6]
    };
    wNew = renorm(wNew);

    // 5) Save
    await supa.from("user_tastes")
      .update({ model_weights: wNew as any, model_updated_at: new Date().toISOString() })
      .eq("profile_id", profile_id);

    return new Response(JSON.stringify({ ok:true, updated:true, p, y, w: wNew }), { 
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