import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
  if (req.method !== 'POST') return bad('POST required', 405);

  try {
    const { flowId } = await req.json().catch(() => ({}));
    if (!flowId) return bad('flowId required', 422);

    // For now return null URL; client will fallback to canvas generator
    return ok({ url: null }, 1);
  } catch (error) {
    console.error('Error generating postcard:', error);
    return bad('Failed to generate postcard', 500);
  }
});

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

const ok = (b: unknown, ttl = 60) =>
  new Response(JSON.stringify(b), { 
    headers: {
      ...cors(),
      'content-type': 'application/json',
      'cache-control': `public, max-age=${ttl}`
    }
  });

const bad = (m: string, c = 400) =>
  new Response(JSON.stringify({ error: m }), { 
    status: c, 
    headers: {
      ...cors(),
      'content-type': 'application/json'
    } 
  });