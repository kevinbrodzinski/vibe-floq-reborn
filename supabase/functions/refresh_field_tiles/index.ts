import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    console.log('Starting field tiles refresh...');

    // Get all distinct H3 tiles with recent activity (last 15 minutes)
    const { data: activeHexes, error: hexError } = await supabase
      .from('vibes_now')
      .select('h3_7')
      .not('h3_7', 'is', null)
      .gte('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .order('h3_7');

    if (hexError) {
      console.error('Error fetching active hexes:', hexError);
      throw hexError;
    }

    if (!activeHexes || activeHexes.length === 0) {
      console.log('No active hexes found, field tiles refresh complete');
      return new Response(
        JSON.stringify({ success: true, message: 'No active tiles to refresh' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique H3 tiles
    const uniqueHexes = [...new Set(activeHexes.map(h => h.h3_7))];
    console.log(`Processing ${uniqueHexes.length} unique H3 tiles`);

    let processed = 0;
    
    // Process each hex tile
    for (const h3_7 of uniqueHexes) {
      try {
        // Get all presence data for this tile
        const { data: presenceData, error: presenceError } = await supabase
          .from('vibes_now')
          .select('profile_id, vibe, updated_at')
          .eq('h3_7', h3_7)
          .gte('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());

        if (presenceError) {
          console.error(`Error fetching presence for ${h3_7}:`, presenceError);
          continue;
        }

        if (!presenceData || presenceData.length === 0) {
          // Clean up stale tiles
          await supabase
            .from('field_tiles')
            .delete()
            .eq('tile_id', h3_7);
          continue;
        }

        // Calculate crowd count
        const crowdCount = presenceData.length;

        // Calculate average vibe using simple mapping - consistent 0-100 scale
        const vibeToHSL = (vibe: string): { h: number; s: number; l: number } => {
          const vibeMap: Record<string, { h: number; s: number; l: number }> = {
            'hype': { h: 280, s: 70, l: 60 },
            'social': { h: 30, s: 70, l: 60 },
            'chill': { h: 240, s: 70, l: 60 },
            'flowing': { h: 200, s: 70, l: 60 },
            'open': { h: 120, s: 70, l: 60 },
            'curious': { h: 260, s: 70, l: 60 },
            'solo': { h: 180, s: 70, l: 60 },
            'romantic': { h: 320, s: 70, l: 60 },
            'weird': { h: 60, s: 70, l: 60 },
            'down': { h: 210, s: 30, l: 40 },
          };
          return vibeMap[vibe?.toLowerCase()] || { h: 240, s: 70, l: 60 };
        };

        const vibes = presenceData.map(p => p.vibe).filter(Boolean);
        let avgVibe = { h: 240, s: 70, l: 60 }; // Default to 'chill' if no vibes (0-100 scale)

        if (vibes.length > 0) {
          const hslValues = vibes.map(vibeToHSL);
          
          // Average hue (circular average for hue)
          let sin = 0, cos = 0;
          hslValues.forEach(({ h }) => {
            const rad = (h * Math.PI) / 180;
            sin += Math.sin(rad);
            cos += Math.cos(rad);
          });
          const avgHue = ((Math.atan2(sin, cos) * 180) / Math.PI + 360) % 360;
          
          // Average saturation and lightness
          const avgSaturation = hslValues.reduce((sum, { s }) => sum + s, 0) / hslValues.length;
          const avgLightness = hslValues.reduce((sum, { l }) => sum + l, 0) / hslValues.length;
          
          avgVibe = {
            h: Math.round(avgHue),
            s: Math.round(avgSaturation), // Already 0-100 scale
            l: Math.round(avgLightness)   // Already 0-100 scale
          };
        }

        // Upsert field tile
        const { error: upsertError } = await supabase
          .from('field_tiles')
          .upsert({
            tile_id: h3_7,
            h3_7: h3_7,
            crowd_count: crowdCount,
            avg_vibe: avgVibe,
            active_floq_ids: [], // TODO: Add floq integration
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'tile_id'
          });

        if (upsertError) {
          console.error(`Error upserting tile ${h3_7}:`, upsertError);
        } else {
          processed++;
        }

      } catch (error) {
        console.error(`Error processing tile ${h3_7}:`, error);
      }
    }

    console.log(`Field tiles refresh complete: ${processed}/${uniqueHexes.length} tiles processed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Refreshed ${processed} field tiles`,
        processed,
        total: uniqueHexes.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Field tiles refresh error:', error);
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