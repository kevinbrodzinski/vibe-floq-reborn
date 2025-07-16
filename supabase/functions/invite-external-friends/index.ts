import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InviteExternalFriendsRequest {
  plan_id: string;
  emails: string[];
  message?: string;
}

export default serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { plan_id, emails, message }: InviteExternalFriendsRequest = await req.json();

    if (!plan_id || !emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: plan_id and emails array' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid email addresses',
          invalid_emails: invalidEmails 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[invite-external-friends] Inviting ${emails.length} emails to plan ${plan_id}`);

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

    // Get plan details for invitation context
    const { data: plan, error: planError } = await supabase
      .from('floq_plans')
      .select('title, planned_at, description')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      console.error('[invite-external-friends] Plan fetch error:', planError);
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get inviter profile for personalization
    const { data: inviter, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single();

    const inviterName = inviter?.display_name || inviter?.username || 'Someone';

    // Check for existing invitations to avoid duplicates
    const { data: existingInvites, error: existingError } = await supabase
      .from('plan_invitations')
      .select('invitee_email')
      .eq('plan_id', plan_id)
      .in('invitee_email', emails);

    if (existingError) {
      console.warn('[invite-external-friends] Error checking existing invites:', existingError);
    }

    const alreadyInvited = existingInvites?.map(inv => inv.invitee_email) || [];
    const newEmails = emails.filter(email => !alreadyInvited.includes(email));

    if (newEmails.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'All emails were already invited',
          already_invited: alreadyInvited,
          newly_invited: []
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create invitation records
    const invitations = newEmails.map(email => ({
      plan_id,
      inviter_id: user.id,
      invitee_email: email,
      invitation_type: 'external',
      status: 'pending'
    }));

    const { data: createdInvites, error: inviteError } = await supabase
      .from('plan_invitations')
      .insert(invitations)
      .select();

    if (inviteError) {
      console.error('[invite-external-friends] Invitation creation error:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invitations' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // TODO: Send email invitations using Resend or similar service
    // For now, we'll just log the invitation details
    console.log(`[invite-external-friends] Created ${createdInvites?.length} invitations`);
    console.log(`[invite-external-friends] Invitation context:`, {
      plan_title: plan.title,
      inviter_name: inviterName,
      message,
      emails: newEmails
    });

    // Log activity
    const { error: activityError } = await supabase
      .from('plan_activities')
      .insert({
        plan_id,
        user_id: user.id,
        activity_type: 'participant_joined', // We can add a new type later
        metadata: {
          action: 'external_invites_sent',
          emails: newEmails,
          count: newEmails.length
        }
      });

    if (activityError) {
      console.warn('[invite-external-friends] Activity log error:', activityError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        invited: newEmails,
        already_invited: alreadyInvited,
        invitations: createdInvites,
        message: `Successfully invited ${newEmails.length} friends to ${plan.title}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[invite-external-friends] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});