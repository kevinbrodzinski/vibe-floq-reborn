import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ok  = (b:unknown)=>new Response(JSON.stringify(b),{status:200,headers:{...CORS,'content-type':'application/json'}});
const bad = (m:string,s=400)=>new Response(JSON.stringify({error:m}),{status:s,headers:{...CORS,'content-type':'application/json'}});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return bad('POST only',405);

  // Use service role for server-side batch (not user-bound)
  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  console.log('Rally expirer: Starting batch process...');

  // 1) End all expired active rallies, collect ids
  const { data: ids, error: endErr } = await supa.rpc('auto_end_expired_rallies');
  if (endErr) {
    console.error('auto_end_expired_rallies failed:', endErr);
    return bad('auto_end_expired_rallies failed: '+endErr.message, 500);
  }

  const ended: string[] = ids ?? [];
  console.log(`Rally expirer: Found ${ended.length} expired rallies to process`);
  
  if (!ended.length) return ok({ ended: 0 });

  // 2) Finalize each into Afterglow
  let okCount = 0;
  for (const rallyId of ended) {
    try {
      console.log(`Rally expirer: Finalizing rally ${rallyId}...`);
      const { error } = await supa.functions.invoke('rally-finalize', { body: { rallyId } });
      if (!error) {
        okCount++;
        console.log(`Rally expirer: Successfully finalized rally ${rallyId}`);
      } else {
        console.warn('Rally expirer: Finalize failed for', rallyId, error);
      }
    } catch (e) {
      console.warn('Rally expirer: Finalize throw for', rallyId, e);
    }
  }

  console.log(`Rally expirer: Completed. Ended: ${ended.length}, Finalized: ${okCount}`);
  return ok({ ended: ended.length, finalized: okCount });
});