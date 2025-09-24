import { corsHeadersFor, handlePreflight } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type CellSample = {
  hour_bucket: number; 
  dow: number; 
  cell_x: number; 
  cell_y: number; 
  vx: number; 
  vy: number; 
  weight: number;
};

Deno.serve(async (req) => {
  const pf = handlePreflight(req); if (pf) return pf;
  const headers = corsHeadersFor(req);

  // user-JWT + anon key (authenticated user required for RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  );

  try {
    const { cityId, samples } = await req.json().catch(() => ({}));
    if (!cityId || !Array.isArray(samples) || !samples.length) {
      return new Response(JSON.stringify({ error: 'bad_payload' }), { status: 400, headers });
    }

    // Basic shape check and clamp with recorded_at timestamp
    const rows = samples.slice(0, 500).map((s: any) => ({
      city_id: cityId,
      hour_bucket: Math.max(0, Math.min(23, s.hour_bucket|0)),
      dow: Math.max(0, Math.min(6, s.dow|0)),
      cell_x: s.cell_x|0,
      cell_y: s.cell_y|0,
      vx: Number.isFinite(s.vx) ? s.vx : 0,
      vy: Number.isFinite(s.vy) ? s.vy : 0,
      weight: Math.max(0.1, Math.min(5, Number(s.weight ?? 1))),
      recorded_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('flow_samples').insert(rows);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, count: rows.length }), { status: 200, headers });
  } catch (e) {
    console.error('[log-flow-samples] err', e);
    return new Response(JSON.stringify({ ok: false, error: 'internal' }), { status: 500, headers });
  }
});