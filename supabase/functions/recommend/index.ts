// supabase/functions/recommend/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // tighten to your domain in prod
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const raw = await req.json();

    // Accept both camelCase and snake_case from clients
    const body = {
      profileId: raw.profileId ?? raw.profile_id ?? null,
      lat: raw.lat,
      lng: raw.lng,
      radiusM: raw.radiusM ?? raw.radius_m ?? 3000,
      limit: raw.limit ?? 20,
      vibe: raw.vibe ?? null,
      tags: raw.tags ?? null,
      tz: raw.tz ?? "America/Los_Angeles",
      useLLM: raw.useLLM ?? raw.use_llm ?? false,
      llmTopK: raw.llmTopK ?? raw.llm_top_k ?? 30,
      ab: raw.ab ?? "edge",
    };

    // ---- call your verbose RPC (already VOLATILE + returns badges/reason/components/weights) ----
    const { data, error } = await supabaseAdmin.rpc("get_personalized_recs_verbose", {
      p_profile_id: body.profileId,
      p_lat: body.lat,
      p_lng: body.lng,
      p_radius_m: body.radiusM,
      p_now: new Date().toISOString(),
      p_vibe: body.vibe,
      p_tags: body.tags,
      p_tz: body.tz,
      p_limit: body.limit,
      p_ab: body.ab,
      p_log: true,
    });
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500, headers: corsHeaders });
    }

    const items = (data ?? []).map((r: any) => r); // (optionally add your "explain" enrichment here)

    return new Response(JSON.stringify({ items }), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});