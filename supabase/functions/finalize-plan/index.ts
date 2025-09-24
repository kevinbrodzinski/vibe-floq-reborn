import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { FinalizePlanRequest } from '../_shared/types.ts'

export default serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { plan_id, force_finalize = false }: FinalizePlanRequest = await req.json();

    if (!plan_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: plan_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[finalize-plan] Finalizing plan ${plan_id}, force: ${force_finalize}`);

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

    // Get plan details and verify permissions (only creator can finalize)
    const { data: plan, error: planError } = await supabase
      .from('floq_plans')
      .select(`
        *,
        plan_stops (*),
        plan_participants (*)
      `)
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      console.error('[finalize-plan] Plan fetch error:', planError);
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (plan.creator_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Only the plan creator can finalize the plan' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (plan.collaboration_status === 'finalized') {
      return new Response(
        JSON.stringify({ error: 'Plan is already finalized' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if there are enough votes (unless forced)
    if (!force_finalize) {
      const { data: votes, error: voteError } = await supabase
        .from('plan_votes')
        .select('stop_id, user_id, vote_type')
        .eq('plan_id', plan_id);

      if (voteError) {
        console.error('[finalize-plan] Vote fetch error:', voteError);
        return new Response(
          JSON.stringify({ error: 'Failed to check voting status' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const totalParticipants = plan.plan_participants?.length || 0;
      const uniqueVoters = new Set(votes?.map(v => v.user_id) || []).size;
      const votingThreshold = Math.ceil(totalParticipants * 0.6); // 60% threshold

      if (uniqueVoters < votingThreshold) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient votes to finalize',
            details: {
              voters: uniqueVoters,
              participants: totalParticipants,
              required: votingThreshold
            }
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // TODO: Apply AI to choose top-voted stops if multiple have equal score
    // - Call: nova.resolveConflictingVotes(votes, planContext)
    
    // Finalize the plan
    const { data: finalizedPlan, error: updateError } = await supabase
      .from('floq_plans')
      .update({ 
        collaboration_status: 'finalized',
        updated_at: new Date().toISOString()
      })
      .eq('id', plan_id)
      .select()
      .single();

    if (updateError) {
      console.error('[finalize-plan] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to finalize plan' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log the finalization activity
    const { error: activityError } = await supabase
      .from('plan_activities')
      .insert({
        plan_id,
        user_id: user.id,
        activity_type: 'plan_finalized',
        metadata: {
          finalized_at: new Date().toISOString(),
          forced: force_finalize
        }
      });

    if (activityError) {
      console.warn('[finalize-plan] Activity log error:', activityError);
    }

    console.log(`[finalize-plan] Plan ${plan_id} finalized successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        plan: finalizedPlan,
        final_stops: plan.plan_stops
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[finalize-plan] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});