import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the user from the auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      throw new Error('Invalid auth token');
    }

    const user = userData.user;
    const { floq_id, invitee_ids } = await req.json();

    // Validate input
    if (!floq_id) {
      throw new Error('Floq ID is required');
    }

    if (!Array.isArray(invitee_ids) || invitee_ids.length === 0) {
      throw new Error('Invitee IDs array is required');
    }

    if (invitee_ids.length > 10) {
      throw new Error('Maximum 10 invitations per request');
    }

    // Verify user is a participant of the floq
    const { data: participant, error: participantError } = await supabase
      .from('floq_participants')
      .select('user_id')
      .eq('floq_id', floq_id)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      throw new Error('User is not a participant of this floq');
    }

    // Filter out invalid invitee IDs and duplicates
    const validInviteeIds = [...new Set(invitee_ids.filter(id => 
      typeof id === 'string' && id.length > 0 && id !== user.id
    ))];

    if (validInviteeIds.length === 0) {
      throw new Error('No valid invitee IDs provided');
    }

    // Prepare invitation records
    const invitations = validInviteeIds.map(invitee_id => ({
      floq_id,
      inviter_id: user.id,
      invitee_id,
      status: 'pending' as const,
    }));

    // Insert invitations with conflict handling
    const { data: insertedInvitations, error: insertError } = await supabase
      .from('floq_invitations')
      .upsert(invitations, {
        onConflict: 'floq_id,invitee_id',
        ignoreDuplicates: true,
      })
      .select('id, invitee_id');

    if (insertError) {
      console.error('Invitation insert error:', insertError);
      throw new Error('Failed to send invitations');
    }

    const insertedCount = insertedInvitations?.length || 0;
    const skippedCount = validInviteeIds.length - insertedCount;

    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted: insertedCount,
        skipped: skippedCount,
        message: `Sent ${insertedCount} invitation${insertedCount !== 1 ? 's' : ''}${
          skippedCount > 0 ? `, skipped ${skippedCount} duplicate${skippedCount !== 1 ? 's' : ''}` : ''
        }`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in invite-to-floq function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});