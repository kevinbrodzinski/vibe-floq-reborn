
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const TTL = 2; // seconds

serve(async (req, ctx) => {
  if (req.method === 'OPTIONS') {
    // CORS pre-flight
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { tile_ids = [], since } = await req.json().catch(() => ({}));
  if (!Array.isArray(tile_ids) || !tile_ids.length) {
    return new Response(JSON.stringify({ error: 'tile_ids[] required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const miss: string[] = [];
  const cached = await Promise.all(
    tile_ids.map(id => ctx.kv.get(`ft:${id}`).then(v => v ? JSON.parse(v) : (miss.push(id), null)))
  );

  let rows: any[] = [];
  if (miss.length) {
    const { data, error } = await ctx.db
      .from('field_tiles')
      .select('*')
      .in('tile_id', miss)
      .gt('updated_at', since ?? 'epoch');
      
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    rows = data!;
    rows.forEach(r => ctx.kv.set(`ft:${r.tile_id}`, JSON.stringify(r), { ex: TTL }));
  }

  const responseBody = { tiles: [...cached.filter(Boolean), ...rows] };
  return new Response(JSON.stringify(responseBody), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
