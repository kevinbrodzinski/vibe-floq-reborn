
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const TTL = 2; // seconds

serve(async (req) => {
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

    // KV cache layer (2 seconds) - only if caches is available
    let cached = null;
    try {
      const cacheKey = `field_tiles:${tile_ids.sort().join(',')}`;
      if (typeof caches !== 'undefined' && caches?.default) {
        try {
          cached = await caches.default.match(cacheKey);
          if (cached) {
            return new Response(cached.body, { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-cache': 'hit' }
            });
          }
        } catch {
          // Ignore cache errors - continue without cache
        }
      }
    } catch (cacheError) {
      console.log('[FIELD_TILES] Cache not available, skipping:', cacheError.message);
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
    
    // Cache for 2 seconds - only if caches is available
    try {
      if (typeof caches !== 'undefined' && caches?.default) {
        try {
          const cacheKey = `field_tiles:${tile_ids.sort().join(',')}`;
          await caches.default.put(cacheKey, resp.clone(), { expirationTtl: 2 });
        } catch {
          // Ignore cache put errors
        }
      }
    } catch (cacheError) {
      console.log('[FIELD_TILES] Cache put failed, continuing:', cacheError.message);
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
