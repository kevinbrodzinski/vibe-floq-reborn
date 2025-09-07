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
    const { cityId, samples }: { cityId: string; samples: CellSample[] } = await req.json();
    
    if (!cityId || !Array.isArray(samples) || samples.length === 0) {
      return new Response(JSON.stringify({ ok: false, inserted: 0 }), { status: 400, headers });
    }

    // Validate and insert flow samples with k-safety client-side gating
    const validSamples = samples
      .filter(s => 
        Number.isFinite(s.vx) && Number.isFinite(s.vy) && 
        s.hour_bucket >= 0 && s.hour_bucket <= 23 &&
        s.dow >= 0 && s.dow <= 6 &&
        s.weight > 0
      )
      .slice(0, 120) // safety cap
      .map(s => ({
        city_id: cityId,
        hour_bucket: s.hour_bucket,
        dow: s.dow,
        cell_x: s.cell_x,
        cell_y: s.cell_y,
        vx: s.vx,
        vy: s.vy,
        weight: s.weight
      }));

    if (validSamples.length === 0) {
      return new Response(JSON.stringify({ ok: true, inserted: 0 }), { status: 200, headers });
    }

    const { data, error } = await supabase
      .from('flow_samples')
      .insert(validSamples);

    if (error) {
      console.error('[log-flow-samples] insert error:', error);
      return new Response(JSON.stringify({ ok: false, inserted: 0, error: error.message }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ ok: true, inserted: validSamples.length }), { status: 200, headers });
  } catch (e) {
    console.error('[log-flow-samples] error:', e);
    return new Response(JSON.stringify({ ok: false, inserted: 0 }), { status: 500, headers });
  }
});