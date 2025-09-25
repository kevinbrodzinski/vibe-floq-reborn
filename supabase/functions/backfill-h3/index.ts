import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { geoToH3 } from 'https://esm.sh/h3-js@4';

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

    console.log('Starting H3 backfill process...');

    // Helper function to back-fill one table
    async function backfillTable(table: string) {
      console.log(`\n▶︎ ${table} — fetching rows missing h3_7 …`);

      // Pull at most N rows at a time so we don't stress WAL
      const PAGE = 1000; // Smaller batch size for edge function
      let done = false, total = 0, offset = 0;

      while (!done) {
        const { data, error } = await supabase
          .from(table)
          .select('id, location')
          .is('h3_7', null)
          .order('id', { ascending: true })
          .range(offset, offset + PAGE - 1);

        if (error) {
          console.error(`Error fetching ${table}:`, error);
          throw error;
        }

        if (!data || data.length === 0) break;

        console.log(`Processing ${data.length} rows from ${table}...`);

        const updates = data.map((row: any) => {
          try {
            // Handle different location formats
            let lat: number, lng: number;
            
            if (row.location?.coordinates) {
              // GeoJSON Point format [lng, lat]
              [lng, lat] = row.location.coordinates;
            } else if (row.location?.type === 'Point' && row.location?.coordinates) {
              [lng, lat] = row.location.coordinates;
            } else {
              console.warn(`Skipping row ${row.id}: invalid location format`);
              return null;
            }

            const h3_7 = geoToH3(lat, lng, 7);
            return { id: row.id, h3_7 };
          } catch (err) {
            console.warn(`Error processing row ${row.id}:`, err);
            return null;
          }
        }).filter(Boolean); // Remove null entries

        if (updates.length > 0) {
          const { error: upErr } = await supabase
            .from(table)
            .upsert(updates, { onConflict: 'id' });

          if (upErr) {
            console.error(`Error updating ${table}:`, upErr);
            throw upErr;
          }

          total += updates.length;
          console.log(`  ↳ wrote ${total} rows so far …`);
        }

        offset += PAGE;
        if (data.length < PAGE) done = true; // Last page
      }

      console.log(`✔︎ ${table}: back-fill complete, ${total} rows updated`);
      return total;
    }

    // Run for the tables that have h3_7 columns
    const results = {
      vibes_now: 0,
      floqs: 0,
      field_tiles: 0
    };

    try {
      results.vibes_now = await backfillTable('vibes_now');
    } catch (err) {
      console.error('Error backfilling vibes_now:', err);
    }

    try {
      results.floqs = await backfillTable('floqs');
    } catch (err) {
      console.error('Error backfilling floqs:', err);
    }

    try {
      results.field_tiles = await backfillTable('field_tiles');
    } catch (err) {
      console.error('Error backfilling field_tiles:', err);
    }

    console.log('\n🎉 H3 backfill process completed');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'H3 backfill completed',
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('H3 backfill error:', error);
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