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
    const { user_id, batch } = await req.json() as { user_id: string; batch: Ping[] };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const rows = batch.map(p => ({
      user_id,
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

    console.log(`Successfully inserted ${rows.length} location pings for user ${user_id}`);
    
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