import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LocationPing {
  lat: number;
  lng: number;
  acc: number;
  ts: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1. Authenticate user with anon client
    const supabaseUser = createClient(url, anonKey, { auth: { persistSession: false } });
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser(jwt);
    
    if (authErr || !user) {
      console.error('Authentication error:', authErr);
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    // 2. Use admin client for database operations
    const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const { batch } = await req.json() as { batch: LocationPing[] };
    
    if (!batch || !Array.isArray(batch)) {
      return new Response('Invalid batch data', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Process in chunks of 500
    const chunks = [];
    for (let i = 0; i < batch.length; i += 500) {
      chunks.push(batch.slice(i, i + 500));
    }

    let totalInserted = 0;
    for (const chunk of chunks) {
      const rows = chunk.map(ping => ({
        user_id: user.id,
        captured_at: ping.ts,
        lat: ping.lat,
        lng: ping.lng,
        acc: ping.acc
      }));

      const { error } = await supabaseAdmin
        .from('raw_locations_staging')
        .insert(rows);
      
      if (error) {
        console.error('Insert error:', error);
        return new Response(JSON.stringify(error), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
      
      totalInserted += rows.length;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      inserted: totalInserted 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});