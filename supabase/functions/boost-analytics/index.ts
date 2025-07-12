import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, floqId, userId } = await req.json();

    console.log('📊 Boost Analytics:', { action, floqId, userId });

    // Rate limiting check (60 boosts per hour per user)
    if (action === 'boost') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { count: recentBoosts } = await supabase
        .from('floq_boosts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo.toISOString());

      if (recentBoosts && recentBoosts >= 60) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            message: 'You can only create 60 boosts per hour',
            retryAfter: 3600
          }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Track boost effectiveness metrics
    if (action === 'boost') {
      // Get floq data before boost
      const { data: floqBefore } = await supabase
        .from('floqs')
        .select('id, participant_count:floq_participants(count)')
        .eq('id', floqId)
        .single();

      // Create boost record
      const { data: boost, error: boostError } = await supabase
        .from('floq_boosts')
        .insert({
          floq_id: floqId,
          user_id: userId,
          boost_type: 'vibe',
          expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours
        })
        .select()
        .single();

      if (boostError) {
        throw boostError;
      }

      // Track analytics event
      const analyticsData = {
        event_type: 'floq_boost',
        floq_id: floqId,
        user_id: userId,
        metadata: {
          participant_count_before: floqBefore?.participant_count || 0,
          boost_id: boost.id,
          timestamp: new Date().toISOString()
        }
      };

      console.log('📈 Boost created with analytics:', analyticsData);

      return new Response(
        JSON.stringify({ 
          success: true, 
          boost,
          analytics: analyticsData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle boost removal
    if (action === 'remove_boost') {
      const { error: removeError } = await supabase
        .from('floq_boosts')
        .delete()
        .eq('floq_id', floqId)
        .eq('user_id', userId);

      if (removeError) {
        throw removeError;
      }

      console.log('📉 Boost removed:', { floqId, userId });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get boost effectiveness metrics
    if (action === 'get_metrics') {
      const { data: metrics } = await supabase
        .rpc('get_boost_effectiveness_metrics', { target_floq_id: floqId });

      return new Response(
        JSON.stringify({ metrics }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Boost analytics error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});