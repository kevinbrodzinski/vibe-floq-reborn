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

    // Generate floq matching suggestions
    if (suggestion_types.includes('floq_match')) {
      const { data: floqSuggestions, error: floqError } = await supabase.rpc('generate_floq_suggestions', {
        p_user_id: user_id,
        p_max_suggestions: Math.floor(max_suggestions / 2)
      });

      if (floqError) {
        console.error("Floq suggestion error:", floqError);
      } else {
        results.floq_suggestions = floqSuggestions || 0;
      }
    }

    // Generate friend suggestions based on relationships
    if (suggestion_types.includes('friend_suggestion')) {
      const { data: friendSuggestions, error: friendError } = await supabase.rpc('generate_friend_suggestions', {
        p_user_id: user_id,
        p_max_suggestions: Math.floor(max_suggestions / 2)
      });

      if (friendError) {
        console.error("Friend suggestion error:", friendError);
      } else {
        results.friend_suggestions = friendSuggestions || 0;
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