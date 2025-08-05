import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { SubmitVoteRequest } from '../_shared/types.ts'

export default serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { plan_id, stop_id, vote_type, emoji_reaction, comment }: SubmitVoteRequest = await req.json();

    if (!plan_id || !stop_id || !vote_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: plan_id, stop_id, vote_type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[submit-plan-vote] Vote ${vote_type} for stop ${stop_id} in plan ${plan_id}`);

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
    
    if (!user || authError) {
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

    // Submit the vote (upsert to handle vote changes)
    const { data: vote, error: voteError } = await supabase
      .from('plan_votes')
      .upsert({
        plan_id,
        stop_id,
        user_id: user.id,
        vote_type,
        emoji_reaction,
        comment,
      }, { 
        onConflict: 'stop_id,user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (voteError) {
      console.error('[submit-plan-vote] Vote error:', voteError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit vote' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[submit-plan-vote] Vote submitted successfully:`, vote);

    return new Response(
      JSON.stringify({ success: true, vote }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[submit-plan-vote] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});