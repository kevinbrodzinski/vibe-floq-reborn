import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface LocationPing {
  ts: string;
  lat: number;
  lng: number;
  acc?: number;
}

interface RequestBody {
  user_id: string;
  batch: LocationPing[];
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('POST only', { status: 405, headers: corsHeaders });
  }

  try {
    const { user_id, batch }: RequestBody = await req.json();
    
    if (!user_id || !batch || !Array.isArray(batch)) {
      return new Response(
        JSON.stringify({ error: 'user_id and batch array required' }), 
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Recording ${batch.length} location pings for user ${user_id}`);

    // Convert batch to database rows
    const rows = batch.map((ping: LocationPing) => ({
      user_id,
      captured_at: ping.ts,
      geom: `SRID=4326;POINT(${ping.lng} ${ping.lat})`,
      accuracy_m: ping.acc ?? null
    }));

    // Bulk insert location data
    const { error } = await supabaseAdmin
      .from('raw_locations')
      .insert(rows);

    if (error) {
      console.error('Database insert error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to insert location data' }), 
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`Successfully inserted ${rows.length} location records`);

    return new Response(
      JSON.stringify({ ok: true, inserted: rows.length }), 
      { headers: corsHeaders }
    );

  } catch (err) {
    console.error('record_locations error:', err);
    return new Response(
      JSON.stringify({ error: err.message }), 
      { status: 500, headers: corsHeaders }
    );
  }
};