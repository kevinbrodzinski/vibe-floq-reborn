import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const TTL = 2; // seconds

serve(async (req, ctx) => {
  if (req.method === 'OPTIONS')  // CORS pre-flight
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }});

  if (req.method !== 'POST')
    return new Response('POST only', { status: 405, headers: { 'Access-Control-Allow-Origin': '*' }});

  const { tile_ids = [], since } = await req.json().catch(() => ({}));
  if (!Array.isArray(tile_ids) || !tile_ids.length)
    return new Response('tile_ids[] required', { status: 400, headers: { 'Access-Control-Allow-Origin': '*' }});

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
    if (error) return new Response(error.message, { status: 500 });

    rows = data!;
    rows.forEach(r => ctx.kv.set(`ft:${r.tile_id}`, JSON.stringify(r), { ex: TTL }));
  }

  return Response.json({ tiles: [...cached.filter(Boolean), ...rows] }, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
  });
});