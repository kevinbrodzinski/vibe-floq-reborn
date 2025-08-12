// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42';
import { corsHeaders, handleOptions, respondWithCors } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
);

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const DEFAULT_MODEL = Deno.env.get('OPENAI_RENANK_MODEL') ?? 'gpt-4o-mini';

serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  if (req.method !== 'POST') {
    return new Response('POST only', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      profile_id,
      lat, lng,
      vibe = null,
      tags = null,
      radius_m = 3000,
      limit = 20,
      tz = 'America/Los_Angeles',
      ab = null,
      use_llm = false,
      llm_top_k = 30,
    } = body || {};

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return respondWithCors({ ok: false, error: 'lat/lng required' }, 400);
    }

    // Try personalized RPC first
    let base: any[] = [];
    try {
      const { data, error } = await supabase.rpc('get_personalized_recs', {
        p_profile_id: profile_id ?? null,
        p_lat: lat, p_lng: lng,
        p_radius_m: radius_m,
        p_vibe: vibe,
        p_tags: tags,
        p_tz: tz,
        p_limit: Math.max(limit, use_llm ? llm_top_k : limit),
        p_ab: ab,
        p_log: !use_llm,
      });
      if (error) throw error;
      base = Array.isArray(data) ? data : [];
    } catch (_e) {
      // Fallback: bbox RPC used by venues-within-radius
      const latDeg = radius_m / 111000;
      const lngDeg = radius_m / (111000 * Math.cos((lat * Math.PI) / 180));
      const { data, error } = await supabase.rpc('get_venues_in_bbox', {
        west: lng - lngDeg,
        south: lat - latDeg,
        east: lng + lngDeg,
        north: lat + latDeg,
      });
      if (error) throw error;
      base = (data ?? []).map((v: any) => ({
        venue_id: v.id,
        name: v.name,
        dist_m: 0,
        score: 0,
        reason: null,
      }));
    }

    if (use_llm && OPENAI_API_KEY && base.length) {
      const topK = base.slice(0, llm_top_k);
      const messages = [
        { role: 'system', content: 'You are a ranking engine. Output valid JSON.' },
        {
          role: 'user',
          content: `Re-rank venues for vibe="${vibe ?? ''}" and tags=${JSON.stringify(tags ?? [])}.
Return strict JSON: {"order":[<venue_id>...],"reasons":{"<venue_id>":"short reason",...}}.
Prefer: vibe/tag match, popularity now, then distance, then rating.\n\n` +
            `candidates=${JSON.stringify(topK)}`,
        },
      ];

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: DEFAULT_MODEL, temperature: 0.2, response_format: { type: 'json_object' }, messages }),
      });

      if (resp.ok) {
        const json = await resp.json();
        const raw = json.choices?.[0]?.message?.content ?? '{}';
        try {
          const parsed = JSON.parse(raw);
          const order: string[] = Array.isArray(parsed?.order) ? parsed.order : [];
          const reasons: Record<string, string> = parsed?.reasons ?? {};
          const map = new Map<string, any>(topK.map((x: any) => [x.venue_id, x]));
          const ranked = order.map((id) => map.get(id)).filter(Boolean);
          for (const c of topK) if (!ranked.find((r: any) => r.venue_id === c.venue_id)) ranked.push(c);
          const final = ranked.slice(0, limit).map((x: any) => ({ ...x, reason: reasons[x.venue_id] ?? x.reason }));

          // Log final (best-effort)
          await supabase.from('recommendation_events').insert({
            profile_id,
            context: { lat, lng, radius_m, now: new Date().toISOString(), tz, vibe, tags, llm: true },
            candidate_ids: final.map((r: any) => r.venue_id),
            scores: final.map((_r: any, i: number) => final.length - i),
            top_ids: final.map((r: any) => r.venue_id),
            ab_bucket: ab ?? 'llm_rerank',
          });

          return respondWithCors({ ok: true, items: final, llm: true });
        } catch {
          // fall through
        }
      }
    }

    return respondWithCors({ ok: true, items: base.slice(0, limit), llm: false });
  } catch (e) {
    return respondWithCors({ ok: false, error: String(e) }, 500);
  }
});