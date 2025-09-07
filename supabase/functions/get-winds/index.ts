import { corsHeadersFor, handlePreflight } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const pf = handlePreflight(req); if (pf) return pf;
  const headers = { ...corsHeadersFor(req), 'Cache-Control': 'public, max-age=60' };

  // user-JWT + anon key (no service role)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  );

  try {
    const { cityId, hour, dow, limit = 48 } = await req.json().catch(() => ({}));
    if (!cityId || hour == null || dow == null) {
      return new Response(JSON.stringify({ error: 'bad_payload' }), { status: 400, headers });
    }

    const { data, error } = await supabase
      .from('trade_winds')
      .select('path_id, points, strength, avg_speed, support')
      .eq('city_id', cityId).eq('hour_bucket', hour).eq('dow', dow)
      .order('strength', { ascending: false })
      .limit(Math.min(200, limit));

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, paths: data ?? [] }), { status: 200, headers });
  } catch (e) {
    console.error('[get-winds] error:', e);
    return new Response(JSON.stringify({ ok: false, paths: [] }), { status: 200, headers });
  }
});