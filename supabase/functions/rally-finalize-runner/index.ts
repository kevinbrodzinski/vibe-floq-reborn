import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all rallies ready for finalization (expired but not processed)
    const { data: readyEntries, error } = await supabase
      .from('rally_finalize_queue')
      .select('*')
      .lte('execute_at', new Date().toISOString())
      .lt('try_count', 3) // Don't retry forever
      .order('execute_at', { ascending: true })
      .limit(10)

    if (error) {
      console.error('Error fetching rally finalize queue:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch queue' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!readyEntries?.length) {
      return new Response(
        JSON.stringify({ processed: 0, message: 'No rallies ready for finalization' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process each rally
    const results = await Promise.all(
      readyEntries.map(async (row) => {
        try {
          const { data, error: finalizeError } = await supabase.functions.invoke<{ok:boolean}>('rally-finalize', {
            body: { rallyId: row.rally_id, endedAt: new Date().toISOString() }
          });
          
          if (finalizeError || !data?.ok) {
            // Bump try count, don't delete
            await supabase
              .from('rally_finalize_queue')
              .update({ try_count: (row.try_count || 0) + 1 })
              .eq('id', row.id);
            return { success: false, rallyId: row.rally_id, error: finalizeError?.message };
          } else {
            // Success - delete the row
            await supabase.from('rally_finalize_queue').delete().eq('id', row.id);
            return { success: true, rallyId: row.rally_id };
          }
        } catch (err) {
          console.error(`Failed to process rally ${row.rally_id}:`, err);
          // Bump try count on unexpected errors
          await supabase
            .from('rally_finalize_queue')
            .update({ try_count: (row.try_count || 0) + 1 })
            .eq('id', row.id);
          return { success: false, rallyId: row.rally_id, error: err.message };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    
    return new Response(
      JSON.stringify({ 
        processed: readyEntries.length,
        successful: successCount,
        failed: readyEntries.length - successCount,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Rally finalize runner error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})