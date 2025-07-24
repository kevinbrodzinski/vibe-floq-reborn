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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const rows = batch.map(p => ({
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
      console.error('Database insert error:', error);
      return new Response(JSON.stringify(error), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Successfully inserted ${rows.length} location pings for user ${user.id}`);
    
    return new Response(JSON.stringify({ inserted: rows.length }), {
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