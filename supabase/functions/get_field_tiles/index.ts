import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req, ctx) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('POST only', { 
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // Parse request body
    const { tile_ids = [], since } = await req.json().catch(() => ({}));
    
    if (!Array.isArray(tile_ids) || !tile_ids.length) {
      return new Response('tile_ids[] required', { 
        status: 400,
        headers: corsHeaders
      });
    }

    console.log(`Fetching tiles for ${tile_ids.length} tile IDs`);

    // KV pass-through with TTL
    const miss: string[] = [];
    const hits = await Promise.all(
      tile_ids.map(async id => {
        const cached = await ctx.kv.get(`ft:${id}`);
        if (cached) return JSON.parse(cached);
        miss.push(id);
        return null;
      })
    );

    let rows: any[] = [];
    if (miss.length) {
      let query = ctx.db
        .from('field_tiles')
        .select('*')
        .in('tile_id', miss);

      // Add since filter if provided
      if (since) {
        query = query.gt('updated_at', since);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Database error:', error);
        return new Response(error.message, { 
          status: 500,
          headers: corsHeaders
        });
      }

      rows = data || [];
      
      // Cache with 2 second TTL
      await Promise.all(
        rows.map(r => ctx.kv.set(`ft:${r.tile_id}`, JSON.stringify(r), { ex: 2 }))
      );
    }

    const allTiles = [...hits.filter(Boolean), ...rows];
    console.log(`Returning ${allTiles.length} tiles`);

    return new Response(
      JSON.stringify({ tiles: allTiles }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});