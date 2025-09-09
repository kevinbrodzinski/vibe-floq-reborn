import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const okJson = (body: unknown, ttlSec = 60) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${ttlSec}` }
  });

const bad = (msg: string, code = 400) =>
  new Response(JSON.stringify({ error: msg }), { status: code, headers: { ...corsHeaders, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return bad('POST required', 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization')! } } });

    const { windowDays = 30 } = await req.json();

    // Mock data for constellation edges
    const mockData = [
      { a: 'user1', b: 'user2', last: Date.now() - 86400000, count: 5 },
      { a: 'user2', b: 'user3', last: Date.now() - 172800000, count: 3 },
      { a: 'user1', b: 'user3', last: Date.now() - 259200000, count: 8 },
    ];

    // Normalize to 0..1 strength with guards for zero spans
    const lastValues = mockData.map(p => p.last);
    const countValues = mockData.map(p => p.count);
    const minLast = Math.min(...lastValues);
    const maxLast = Math.max(...lastValues);
    const minCount = Math.min(...countValues);
    const maxCount = Math.max(...countValues);

    const spanLast = Math.max(1, maxLast - minLast);
    const spanCount = Math.max(1, maxCount - minCount);

    const edges = mockData.map(p => {
      const recency01 = (p.last - minLast) / spanLast;
      const freq01 = (p.count - minCount) / spanCount;
      const strength = Math.max(0.1, Math.min(1, 0.6 * recency01 + 0.4 * freq01));
      return { a: p.a, b: p.b, strength };
    });

    return okJson({ edges, ttlSec: 120 }, 120);
  } catch (e) {
    console.error('constellation-edges error:', e);
    return bad('Internal error', 500);
  }
});