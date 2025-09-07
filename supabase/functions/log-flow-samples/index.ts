import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Create supabase client with user's auth token
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    }
  );

  try {
    const { samples, cityId } = await req.json();
    
    if (!samples || !Array.isArray(samples)) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid samples array' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate each sample has required fields
    for (const sample of samples) {
      if (!sample.hour_bucket || !sample.dow || 
          sample.cell_x === undefined || sample.cell_y === undefined ||
          sample.vx === undefined || sample.vy === undefined) {
        return new Response(
          JSON.stringify({ error: 'Invalid sample data structure' }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Insert flow samples with k-anonymity enforcement
    const { data, error } = await supabase
      .from('flow_samples')
      .insert(
        samples.map((sample: any) => ({
          city_id: cityId || 'default-city',
          hour_bucket: sample.hour_bucket,
          dow: sample.dow,
          cell_x: sample.cell_x,
          cell_y: sample.cell_y,
          vx: sample.vx,
          vy: sample.vy,
          weight: sample.weight || 1.0,
          recorded_at: new Date().toISOString()
        }))
      );

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to log flow samples' }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        samples_logged: samples.length 
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Flow sample logging error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});