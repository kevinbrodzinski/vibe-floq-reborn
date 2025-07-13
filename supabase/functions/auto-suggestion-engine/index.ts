import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuggestionRequest {
  user_id?: string;
  suggestion_types?: string[];
  max_suggestions?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const { 
      user_id = null, 
      suggestion_types = ['floq_match', 'friend_suggestion'], 
      max_suggestions = 50 
    } = body as SuggestionRequest;

    console.log(`Generating suggestions for user: ${user_id || 'all users'}`);

    const results = {
      floq_suggestions: 0,
      friend_suggestions: 0,
      expired_suggestions_cleaned: 0
    };

    // Clean up expired suggestions first
    const { data: cleanupData, error: cleanupError } = await supabase.rpc('cleanup_expired_suggestions');
    if (!cleanupError) {
      results.expired_suggestions_cleaned = cleanupData || 0;
    }

    // Get active users with presence data for batch processing
    const { data: activeUsers, error: usersError } = await supabase
      .from("v_active_users")
      .select("user_id, lat, lng")
      .limit(max_suggestions);

    if (usersError) {
      console.error("Active users query error:", usersError);
      throw usersError;
    }

    // Process each active user for suggestions
    for (const user of activeUsers || []) {
      try {
        // Generate floq matching suggestions
        if (suggestion_types.includes('floq_match')) {
          const { data: floqSuggestions, error: floqError } = await supabase.rpc('generate_floq_suggestions', {
            p_user_id: user.user_id,
            p_user_lat: user.lat,
            p_user_lng: user.lng,
            p_limit: 3
          });

          if (floqError) {
            console.error(`Floq suggestion error for user ${user.user_id}:`, floqError);
          } else {
            results.floq_suggestions += (floqSuggestions?.length || 0);
          }
        }

        // Generate friend suggestions based on relationships
        if (suggestion_types.includes('friend_suggestion')) {
          const { data: friendSuggestions, error: friendError } = await supabase.rpc('generate_friend_suggestions', {
            p_user_id: user.user_id,
            p_user_lat: user.lat,
            p_user_lng: user.lng,
            p_limit: 3
          });

          if (friendError) {
            console.error(`Friend suggestion error for user ${user.user_id}:`, friendError);
          } else {
            results.friend_suggestions += (friendSuggestions?.length || 0);
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${user.user_id}:`, userError);
      }
    }

    // Update suggestion performance metrics
    const { error: metricsError } = await supabase.rpc('update_suggestion_metrics');
    if (metricsError) {
      console.error("Metrics update error:", metricsError);
    }

    console.log(`Suggestion generation complete:`, results);

    return new Response(JSON.stringify({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Auto-suggestion engine error:", error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});