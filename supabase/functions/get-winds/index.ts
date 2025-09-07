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
    const { cityId, hour, dow, k = 5 } = await req.json().catch(() => ({}));
    if (!cityId || hour == null || dow == null) {
      return new Response(JSON.stringify({ error: 'Missing cityId/hour/dow' }), { status: 400, headers });
    }

    const { data, error } = await supabase.rpc('flow_cells_k5', { p_city_id: cityId, p_hour: hour, p_dow: dow, p_k: k });
    if (error) throw error;

    return new Response(JSON.stringify({ ok:true, cells:data ?? [] }), { status: 200, headers });
  } catch (e) {
    console.error('[get-winds] error:', e);
    return new Response(JSON.stringify({ ok:false, cells:[] }), { status: 200, headers });
  }
});