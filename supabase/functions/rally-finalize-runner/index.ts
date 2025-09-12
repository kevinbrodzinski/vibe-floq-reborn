// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

const ok = (b: unknown) =>
  new Response(JSON.stringify(b), { status: 200, headers: { ...CORS, 'content-type': 'application/json' } });
const bad = (m: string, s = 500) =>
  new Response(JSON.stringify({ error: m }), { status: s, headers: { ...CORS, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return bad('POST only', 405);

  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data: ids, error: endErr } = await supa.rpc('auto_end_expired_rallies');
  if (endErr) return bad('auto_end_expired_rallies failed: ' + endErr.message);

  const ended: string[] = ids ?? [];
  if (!ended.length) return ok({ ended: 0, finalized: 0 });

  let okCount = 0;
  for (const rallyId of ended) {
    try {
      const { error } = await supa.functions.invoke('rally-finalize', { body: { rallyId } });
      if (!error) okCount++;
    } catch {
      // continue
    }
  }

  return ok({ ended: ended.length, finalized: okCount });
});