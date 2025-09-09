// supabase/functions/constellation-edges/index.ts
// POST { windowDays?: number }
// → { edges: { a:string, b:string, strength:number, lastSync?:string }[], ttlSec:number }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const okJson = (body: unknown, ttlSec = 120) =>
  new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${ttlSec}` }});
const bad = (msg: string, code = 400) =>
  new Response(JSON.stringify({ error: msg }), { status: code, headers: { ...corsHeaders, 'content-type': 'application/json' }});

type Edge = { a: string; b: string; strength: number; lastSync?: string };

function normalize(val: number, lo: number, hi: number) {
  return Math.max(0, Math.min(1, (val - lo) / Math.max(1e-6, hi - lo)));
}
// combine recency(0..1) & frequency(0..1)
function score(recency01: number, freq01: number) {
  // weight recency a bit higher so fresh ties pop
  return Math.max(0.1, Math.min(1, 0.6 * recency01 + 0.4 * freq01));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST')    return bad('POST required', 405);

  try {
    const { windowDays = 30 } = await req.json().catch(() => ({}));
    const url  = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization')! } } });

    // Collect raw interactions into a map keyed by pair "low::high"
    const now = Date.now();
    const since = new Date(now - windowDays * 24 * 3600 * 1000).toISOString();
    const pairs = new Map<string, { a: string; b: string; count: number; last: number }>();

    function bump(a: string, b: string, tsISO?: string) {
      if (!a || !b || a === b) return;
      const low = a < b ? a : b;
      const high = a < b ? b : a;
      const key = `${low}::${high}`;
      const ts = Date.parse(tsISO || new Date().toISOString());
      const cur = pairs.get(key) ?? { a: low, b: high, count: 0, last: 0 };
      cur.count += 1;
      cur.last = Math.max(cur.last, ts);
      pairs.set(key, cur);
    }

    // Try typical sources; skip silently if missing.

    // 1) Co-participation in plans within window
    try {
      // Expect a table like plan_participants(plan_id, profile_id, joined_at)
      const { data: pp, error } = await supabase
        .from('plan_participants')
        .select('plan_id, profile_id, joined_at')
        .gte('joined_at', since)
        .limit(5000);
      if (!error && pp) {
        // group by plan_id
        const byPlan = new Map<string, any[]>();
        for (const row of pp) {
          const arr = byPlan.get(row.plan_id) ?? [];
          arr.push(row);
          byPlan.set(row.plan_id, arr);
        }
        byPlan.forEach(list => {
          for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
              bump(list[i].profile_id, list[j].profile_id, list[i].joined_at || since);
            }
          }
        });
      }
    } catch {}

    // 2) Direct messages within window (DM threads)
    try {
      // Expect messages(sender_profile_id, recipient_profile_id, created_at) or a threads table
      const { data: dm1 } = await supabase
        .from('messages')
        .select('sender_profile_id, recipient_profile_id, created_at')
        .gte('created_at', since)
        .limit(5000);
      if (dm1) {
        for (const m of dm1) bump(m.sender_profile_id, m.recipient_profile_id, m.created_at);
      }
    } catch {}

    // 3) Recent co-votes on the same stop
    try {
      // votes(stop_id, profile_id, created_at)
      const { data: votes } = await supabase
        .from('votes')
        .select('stop_id, profile_id, created_at')
        .gte('created_at', since)
        .limit(5000);
      if (votes) {
        const byStop = new Map<string, any[]>();
        for (const v of votes) {
          const arr = byStop.get(v.stop_id) ?? [];
          arr.push(v);
          byStop.set(v.stop_id, arr);
        }
        byStop.forEach(list => {
          for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
              bump(list[i].profile_id, list[j].profile_id, list[i].created_at || since);
            }
          }
        });
      }
    } catch {}

    // Derive strengths
    const edges: Edge[] = [];
    let minLast = now, maxLast = 0, minCount = Infinity, maxCount = 0;
    pairs.forEach((p) => {
      minLast = Math.min(minLast, p.last);
      maxLast = Math.max(maxLast, p.last);
      minCount = Math.min(minCount, p.count);
      maxCount = Math.max(maxCount, p.count);
    });
    pairs.forEach((p) => {
      const recency01 = normalize(p.last, minLast, maxLast || now);
      const freq01    = normalize(p.count, minCount, Math.max(minCount+1, maxCount));
      edges.push({ a: p.a, b: p.b, strength: score(recency01, freq01), lastSync: new Date(p.last).toISOString() });
    });

    return okJson({ edges, ttlSec: 120 }, 120);
  } catch (e) {
    return bad(e?.message ?? 'error', 500);
  }
});