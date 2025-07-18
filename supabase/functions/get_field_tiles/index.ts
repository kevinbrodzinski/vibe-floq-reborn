import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Fetching tiles for ${tile_ids.length} tile IDs`);

    // Query field_tiles table
    let query = supabase
      .from('field_tiles')
      .select('*')
      .in('tile_id', tile_ids);

    // Add since filter if provided
    if (since) {
      query = query.gt('updated_at', since);
    }

    const { data: tiles, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response(error.message, { 
        status: 500,
        headers: corsHeaders
      });
    }

    console.log(`Returning ${tiles?.length || 0} tiles`);

    return new Response(
      JSON.stringify({ tiles: tiles || [] }),
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