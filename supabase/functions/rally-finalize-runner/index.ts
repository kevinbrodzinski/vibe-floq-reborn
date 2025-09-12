import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
};

const ok  = (b:unknown)=>new Response(JSON.stringify(b),{status:200,headers:{...corsHeaders,'content-type':'application/json'}});
const bad = (m:string,s=400)=>new Response(JSON.stringify({error:m}),{status:s,headers:{...corsHeaders,'content-type':'application/json'}});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return bad('POST only',405);

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` } } }
  );

  // Fetch limited batch
  const { data: batch, error: fetchError } = await supa
    .from('rally_finalize_queue')
    .select('id, rally_id, try_count')
    .order('queued_at', { ascending: true })
    .limit(10);

  if (fetchError) {
    console.error('Failed to fetch finalize queue:', fetchError);
    return bad('Failed to fetch queue', 500);
  }

  if (!batch?.length) {
    return ok({ processed: 0, message: 'No rallies ready for finalization' });
  }

  let processed = 0;
  for (const row of batch) {
    try {
      const { data, error: finalizeError } = await supa.functions.invoke<{ok:boolean}>('rally-finalize', {
        body: { rallyId: row.rally_id, endedAt: new Date().toISOString() }
      });

      if (finalizeError || !data?.ok) {
        await supa.from('rally_finalize_queue')
          .update({ try_count: (row.try_count || 0) + 1 })
          .eq('id', row.id);
      } else {
        await supa.from('rally_finalize_queue').delete().eq('id', row.id);
        processed++;
      }
    } catch (err:any) {
      console.error(`Failed to process rally ${row.rally_id}:`, err);
      await supa.from('rally_finalize_queue')
        .update({ try_count: (row.try_count || 0) + 1 })
        .eq('id', row.id);
    }
  }

  return ok({ processed, total: batch.length });
});