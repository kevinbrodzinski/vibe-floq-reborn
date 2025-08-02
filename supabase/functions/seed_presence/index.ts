import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { latLngToCell } from 'https://esm.sh/h3-js@4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Seeding demo presence data around Venice Beach...');

    // Venice Beach coordinates
    const veniceBeachLat = 33.9850;
    const veniceBeachLng = -118.4695;

    const vibes = ['hype', 'social', 'chill', 'flowing', 'open', 'curious', 'solo', 'romantic'];
    const insertData = [];

    // Generate 50 fake presence records within 2km of Venice Beach
    for (let i = 0; i < 50; i++) {
      // Random position within ~2km radius
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * 0.018; // ~2km in degrees
      
      const lat = veniceBeachLat + Math.cos(angle) * distance;
      const lng = veniceBeachLng + Math.sin(angle) * distance;
      
      // Calculate H3 index
      const h3_7 = latLngToCell(lat, lng, 7);
      
      const vibe = vibes[Math.floor(Math.random() * vibes.length)];
      
      insertData.push({
        profile_id: `demo-user-${i}`,
        location: JSON.stringify({
          type: 'Point',
          coordinates: [lng, lat]
        }),
        vibe: vibe,
        h3_7: h3_7,
        updated_at: new Date().toISOString(),
        visibility: 'public'
      });
    }

    // Insert demo data
    const { error: insertError } = await supabase
      .from('vibes_now')
      .upsert(insertData, { onConflict: 'profile_id' });

    if (insertError) {
      console.error('Error inserting demo data:', insertError);
      throw insertError;
    }

    console.log(`Successfully inserted ${insertData.length} demo presence records (first 3: ${JSON.stringify(insertData.slice(0, 3).map(d => d.profile_id))})`);

    // Trigger field tiles refresh
    const refreshResponse = await supabase.functions.invoke('refresh_field_tiles');
    
    if (refreshResponse.error) {
      console.warn('Warning: Failed to refresh field tiles:', refreshResponse.error);
    } else {
      console.log('Field tiles refreshed successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Seeded ${insertData.length} demo records around Venice Beach`,
        center: { lat: veniceBeachLat, lng: veniceBeachLng },
        records: insertData.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Demo data seeding error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});