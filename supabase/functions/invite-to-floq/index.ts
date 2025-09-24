import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the user from the auth token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Invalid auth token');
    }

    
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

    // Try to insert invitations individually to handle conflicts properly
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const invitation of invitations) {
      const { error: insertError } = await supabase
        .from('floq_invitations')
        .insert(invitation);
      
      if (insertError) {
        if (insertError.code === '23505') { // Unique constraint violation
          skippedCount++;
        } else {
          console.error('Invitation insert error:', insertError);
          throw new Error('Failed to send invitations');
        }
      } else {
        insertedCount++;
      }
    }


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