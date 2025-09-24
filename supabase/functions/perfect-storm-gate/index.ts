// supabase/functions/perfect-storm-gate/index.ts
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

// ephemeral in-memory fallback per instance
const seen = new Map<string, number>(); // key -> ms

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST')    return bad('POST required', 405);

  try {
    const url  = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization')! } } });

    let key = '';
    // Try auth user
    try {
      const { data: { user } } = await supabase.auth.getUser();
      key = user?.id ?? '';
    } catch {}
    // Fallback: IP
    if (!key) key = req.headers.get('x-forwarded-for') ?? 'anon';

    const now = Date.now();
    const last = seen.get(key) ?? 0;
    const DAY = 24*3600*1000;
    if (now - last < DAY) {
      return okJson({ allow: false, ttlSec: Math.ceil((DAY - (now-last))/1000) }, 30);
    }
    seen.set(key, now);
    return okJson({ allow: true, ttlSec: 24*3600 }, 60);
  } catch (e) {
    // be safe; allow once if error
    return okJson({ allow: true, ttlSec: 3600 }, 60);
  }
});