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

    // First, check if this is already a share slug
    let { data: shareLink, error } = await supabase
      .from('plan_share_links')
      .select('plan_id, click_count')
      .eq('slug', slug)
      .maybeSingle();

    let planId = shareLink?.plan_id;

    // If not found as a share slug, check if it's a direct plan ID
    if (!shareLink) {
      const { data: plan } = await supabase
        .from('floq_plans')
        .select('id, creator_id')
        .eq('id', slug)
        .maybeSingle();

      if (plan) {
        // Create a share link for this plan
        console.log('Creating share link for plan ID:', slug);
        
        const { data: newShareLink, error: createError } = await supabase
          .from('plan_share_links')
          .insert({
            plan_id: slug,
            slug: slug, // Use the plan ID as the slug for now
            created_by: plan.creator_id,
            click_count: 1,
            last_accessed_at: new Date().toISOString(),
          })
          .select('plan_id')
          .single();

        if (createError) {
          console.error('Failed to create share link:', createError);
          return new Response(
            JSON.stringify({ error: 'Failed to create share link' }), 
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        planId = newShareLink.plan_id;
      }
    } else {
      // Track usage - increment click count
      await supabase
        .from('plan_share_links')
        .update({
          click_count: (shareLink.click_count || 0) + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('slug', slug);
    }

    if (!planId) {
      return new Response(
        JSON.stringify({ error: 'Plan not found' }), 
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully resolved slug to plan_id:', planId);

    return new Response(
      JSON.stringify({ plan_id: planId }), 
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