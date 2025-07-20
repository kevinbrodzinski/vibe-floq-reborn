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

    // Try to resolve by slug first
    const { data: link } = await supabase
      .from('plan_share_links')
      .select('plan_id, created_by, click_count')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle();

    if (link) {
      // ✅ Track anonymous click
      await supabase
        .from('plan_share_links')
        .update({
          click_count: (link.click_count || 0) + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('slug', slug);

      console.log('Successfully resolved slug to plan_id:', link.plan_id);
      return new Response(JSON.stringify({
        plan_id: link.plan_id,
        resolved_slug: slug,
        creator_id: link.created_by,
        floq_id: null, // will be fetched later
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fallback: maybe it's a plan_id directly
    const { data: plan } = await supabase
      .from('floq_plans')
      .select('id, floq_id, creator_id')
      .eq('id', slug)
      .limit(1)
      .maybeSingle();

    if (plan) {
      console.log('Successfully resolved plan ID to plan_id:', plan.id);
      return new Response(JSON.stringify({
        plan_id: plan.id,
        resolved_slug: plan.id,
        floq_id: plan.floq_id,
        creator_id: plan.creator_id,
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(
      JSON.stringify({ error: 'Plan not found' }), 
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
})