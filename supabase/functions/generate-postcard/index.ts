import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
} as const;

const ok = (b: unknown) => new Response(JSON.stringify(b), {
  headers: { ...CORS, 'content-type': 'application/json' }
});

const bad = (m: string, c = 400) => new Response(JSON.stringify({ error: m }), {
  status: c,
  headers: { ...CORS, 'content-type': 'application/json' }
});

type Body = { flowId: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return bad('POST required', 405);

  let body: Body;
  try { 
    body = await req.json();
  } catch { 
    return bad('invalid JSON', 422);
  }
  
  if (!body.flowId) return bad('flowId required', 422);

  console.log(`[generate-postcard] Processing flow: ${body.flowId}`);

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!, 
    Deno.env.get('SUPABASE_ANON_KEY')!, 
    {
      global: { 
        headers: { Authorization: req.headers.get('Authorization') || '' } 
      }
    }
  );

  try {
    // Get flow summary for postcard data
    const { data: summary, error: sumErr } = await supa.rpc('flow_summary', { 
      _flow_id: body.flowId 
    });
    
    if (sumErr) {
      console.error('[generate-postcard] Summary error:', sumErr);
      return bad(sumErr.message, 500);
    }

    // In production, render server-side or kick a worker. For now a branded placeholder URL:
    const params = new URLSearchParams({
      text: `Flow Reflection`,
      font: 'Inter',
      size: '1080x1080',
      bg: '0f1024',
      color: 'ffffff'
    });
    
    const postcardUrl = `https://placehold.co/1080x1080/0f1024/ffffff/png?text=${encodeURIComponent(`Flow+Reflection%0A${Math.round(summary.elapsedMin || 0)}+min%0A${((summary.distanceM || 0) / 1000).toFixed(1)}+km${summary.suiPct ? `%0A${summary.suiPct}%25+sun` : ''}`)}`;

    console.log('[generate-postcard] Generated postcard URL:', postcardUrl);

    // Update flow with postcard URL
    const { error: updateErr } = await supa
      .from('flows')
      .update({ postcard_url: postcardUrl })
      .eq('id', body.flowId);

    if (updateErr) {
      console.error('[generate-postcard] Update error:', updateErr);
      return bad(updateErr.message, 500);
    }

    console.log('[generate-postcard] Successfully updated flow with postcard URL');

    return ok({ postcardUrl });
  } catch (error) {
    console.error('[generate-postcard] Unexpected error:', error);
    return bad('Internal server error', 500);
  }
});