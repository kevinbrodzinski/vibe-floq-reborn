
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const TTL = 2; // seconds

serve(async (req) => {
  // Log incoming request safely
  console.log('[FIELD_TILES] incoming', {
    method: req.method,
    ua: req.headers.get('user-agent'),
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { tile_ids = [], since } = await req.json().catch(() => ({}));
    if (!Array.isArray(tile_ids) || !tile_ids.length) {
      return new Response(JSON.stringify({ error: 'tile_ids[] required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // KV cache layer (2 seconds) - only if cache is available
    const cacheKey = `field_tiles:${tile_ids.sort().join(',')}`;
    if (typeof caches !== 'undefined' && caches.default) {
      const cached = await caches.default.match(cacheKey);
      if (cached) {
        return new Response(cached.body, { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-cache': 'hit' }
        });
      }
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query field tiles from database
    const { data, error } = await supabase
      .from('field_tiles')
      .select('*')
      .in('tile_id', tile_ids)
      .gt('updated_at', since ?? 'epoch');
      
    if (error) {
      console.error('[FIELD_TILES] Database error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tiles = data || [];
    if (Deno.env.get('ENV') !== 'prod') {
      console.log(`[FIELD_TILES] Returning ${tiles.length} tiles for ${tile_ids.length} requested IDs`);
    }
    
    const resp = new Response(JSON.stringify({ tiles }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
    // Cache for 2 seconds - only if cache is available
    if (typeof caches !== 'undefined' && caches.default) {
      await caches.default.put(cacheKey, resp.clone(), { expirationTtl: 2 });
    }
    return resp;

  } catch (error) {
    console.error('[FIELD_TILES] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
