import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Ping = { ts: string; lat: number; lng: number; acc?: number };

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ⚡ Initialize Supabase client first
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // ⚠️ SECURITY: Get authenticated user, don't trust body
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization') ?? ''
    );
    
    if (authError || !user) {
      return new Response('Unauthorized', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    const { batch } = await req.json() as { batch: Ping[] };

    // ⚡ Payload chunking for high-volume users
    const MAX_CHUNK_SIZE = 500;
    if (batch.length > MAX_CHUNK_SIZE) {
      console.log(`Large batch detected (${batch.length} pings), chunking into ${MAX_CHUNK_SIZE} per chunk`);
    }

    let totalInserted = 0;

    // Process in chunks
    for (let i = 0; i < batch.length; i += MAX_CHUNK_SIZE) {
      const chunk = batch.slice(i, i + MAX_CHUNK_SIZE);
      
      const rows = chunk.map(p => ({
        user_id: user.id,  // ✅ Use authenticated user ID
        captured_at: p.ts,
        lat: p.lat,
        lng: p.lng,
        acc: p.acc ?? null
      }));

      const { error } = await supabase
        .from("raw_locations_staging")
        .insert(rows);

      if (error) {
        console.error(`Database insert error for chunk ${Math.floor(i/MAX_CHUNK_SIZE) + 1}:`, error);
        return new Response(JSON.stringify(error), { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      totalInserted += rows.length;
      console.log(`Chunk ${Math.floor(i/MAX_CHUNK_SIZE) + 1}: inserted ${rows.length} pings`);
    }

    console.log(`Successfully inserted ${totalInserted} location pings for user ${user.id}`);
    
    return new Response(JSON.stringify({ inserted: totalInserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};