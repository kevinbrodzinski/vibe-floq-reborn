import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { slug } = await req.json();

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Missing slug parameter' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Resolving plan slug:', slug);

    // Find the plan_id for this slug
    const { data, error } = await supabase
      .from('plan_share_links')
      .select('plan_id')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Database error' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: 'Plan not found' }), 
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Track usage - increment click count and update last accessed
    await supabase
      .from('plan_share_links')
      .update({
        click_count: supabase.raw('COALESCE(click_count, 0) + 1'),
        last_accessed_at: new Date().toISOString(),
      })
      .eq('slug', slug);

    console.log('Successfully resolved slug to plan_id:', data.plan_id);

    return new Response(
      JSON.stringify({ plan_id: data.plan_id }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});