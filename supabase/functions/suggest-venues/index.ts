import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SuggestVenuesRequest {
  plan_id: string;
  budget_range?: { min: number; max: number };
  radius_km?: number;
}

export default serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { plan_id, budget_range, radius_km = 2 }: SuggestVenuesRequest = await req.json();

    if (!plan_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: plan_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[suggest-venues] Getting suggestions for plan ${plan_id}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify user has access to this plan
    const { data: planAccess, error: accessError } = await supabase
      .rpc('user_has_plan_access', { p_plan_id: plan_id });

    if (accessError || !planAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this plan' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get plan details including vibe tags and existing stops
    const { data: plan, error: planError } = await supabase
      .from('floq_plans')
      .select(`
        *,
        plan_stops (*)
      `)
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      console.error('[suggest-venues] Plan fetch error:', planError);
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get venue suggestions based on plan context
    // For now, we'll use a simple venue query - this can be enhanced with AI later
    const { data: venues, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .limit(10);

    if (venueError) {
      console.error('[suggest-venues] Venue fetch error:', venueError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch venue suggestions' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // TODO: Enhance with AI-powered suggestions based on:
    // - Plan vibe tags
    // - Existing stops
    // - Group preferences
    // - Time of day
    // - Budget constraints
    // - Friend presence at venues

    const suggestions = (venues || []).map((venue, index) => ({
      venue,
      match_score: Math.random() * 0.5 + 0.5, // Placeholder scoring
      reasoning: ['Good match for plan vibes', 'Popular with similar groups'],
      estimated_cost: Math.floor(Math.random() * 50) + 20,
      friend_presence: Math.floor(Math.random() * 3),
    }));

    console.log(`[suggest-venues] Returning ${suggestions.length} venue suggestions`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        suggestions,
        plan_context: {
          vibe_tags: plan.vibe_tags,
          existing_stops: plan.plan_stops?.length || 0,
          budget_per_person: plan.budget_per_person
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[suggest-venues] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});