// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!, // anon is fine for read RPC
);

const DO_RERANK = (Deno.env.get("LLM_RERANK") || "").toLowerCase() === "true";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const DEFAULT_MODEL = Deno.env.get("OPENAI_RERANK_MODEL") ?? "gpt-4o-mini"; // change if you prefer

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      profile_id,
      lat, lng,
      vibe, tags,
      radius_m = 3000,
      limit = 20,
      tz = "America/Los_Angeles",
      ab = null,
      use_llm = false,        // <- toggle
      llm_top_k = 30,
    } = await req.json();

    if (!profile_id || !lat || !lng) {
      return new Response(JSON.stringify({ ok: false, error: "profile_id, lat, lng required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1) DB scoring
    const { data: base, error } = await supabase.rpc("get_personalized_recs", {
      p_profile_id: profile_id,
      p_lat: lat, p_lng: lng,
      p_radius_m: radius_m,
      p_vibe: vibe ?? null,
      p_tags: tags ?? null,
      p_tz: tz,
      p_limit: Math.max(limit, use_llm ? llm_top_k : limit),
      p_ab: ab ?? ((DO_RERANK && OPENAI_API_KEY) ? 'edge+llm' : 'edge'),
      p_log: !use_llm, // if LLM, we'll log after re-rank
    });
    if (error) throw error;
    const candidates = Array.isArray(base) ? base : [];

    // 2) LLM re-rank (optional, graceful fallback)
    if (DO_RERANK && OPENAI_API_KEY && Array.isArray(candidates) && candidates.length && use_llm) {
      const topK = candidates.slice(0, llm_top_k);
      const prompt = {
        role: "user",
        content:
          `Re-rank venues for vibe="${vibe ?? ""}" and tags=${JSON.stringify(tags ?? [])}.
Return strict JSON: {"order":[<venue_id>...],"reasons":{"<venue_id>":"short reason",...}}.
Prefer: vibe/tag match, popularity now, then distance, then rating.\n\n` +
          `candidates=${JSON.stringify(topK)}`,
      };

      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You are a ranking engine. Output only valid JSON." },
            prompt,
          ],
        }),
      });

      if (resp.ok) {
        const json = await resp.json();
        const raw = json.choices?.[0]?.message?.content ?? "{}";
        try {
          const parsed = JSON.parse(raw);
          const order: string[] = Array.isArray(parsed?.order) ? parsed.order : [];
          const reasons: Record<string, string> = parsed?.reasons ?? {};

          // produce final list in the requested order, fallback if ids missing
          const map = new Map<string, any>(topK.map((x: any) => [x.venue_id, x]));
          const ranked = order
            .map((id) => map.get(id))
            .filter(Boolean);

          // append any missing candidates to preserve coverage
          for (const c of topK) if (!ranked.find((r: any) => r.venue_id === c.venue_id)) ranked.push(c);

          const final = ranked.slice(0, limit).map((x: any) => ({
            ...x,
            reason: reasons[x.venue_id] ?? x.reason,
          }));

          // optional: log final to recommendation_events with ab bucket
          await supabase.from("recommendation_events").insert({
            profile_id,
            context: { lat, lng, radius_m, now: new Date().toISOString(), tz, vibe, tags, llm: true },
            candidate_ids: final.map((r: any) => r.venue_id),
            scores: final.map((_r: any, i: number) => final.length - i), // pseudo scores in order
            top_ids: final.map((r: any) => r.venue_id),
            ab_bucket: ab ?? "llm_rerank",
          });

          return new Response(JSON.stringify({ ok: true, items: final, llm: true }), { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch {
          // fall through to baseline if JSON parsing fails
        }
      }
      // If API error or bad JSON, fall back to baseline top-N (no throw)
    }

    // Baseline return
    const items = candidates.slice(0, limit);
    return new Response(JSON.stringify({ ok: true, items, llm: false }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});