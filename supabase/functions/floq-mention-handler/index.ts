import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FloqMentionRequest {
  floq_id: string;
  sender_id: string;
  message_content: string;
  message_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 Floq mention handler started');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { floq_id, sender_id, message_content, message_id }: FloqMentionRequest = await req.json();

    console.log('Processing floq mention:', { floq_id, sender_id, message_id });

    // Get floq details and participants
    const { data: floq, error: floqError } = await supabase
      .from('floqs')
      .select('title, creator_id')
      .eq('id', floq_id)
      .single();

    if (floqError || !floq) {
      console.error('Error fetching floq:', floqError);
      return new Response(
        JSON.stringify({ error: 'Floq not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get sender profile
    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', sender_id)
      .single();

    if (senderError || !senderProfile) {
      console.error('Error fetching sender profile:', senderError);
      return new Response(
        JSON.stringify({ error: 'Sender not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get all participants except the sender
    const { data: participants, error: participantsError } = await supabase
      .from('floq_participants')
      .select('user_id')
      .eq('floq_id', floq_id)
      .neq('user_id', sender_id);

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch participants' }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`Creating notifications for ${participants?.length || 0} participants`);

    // Create notifications for all participants
    const notifications = participants?.map(participant => ({
      user_id: participant.user_id,
      kind: 'floq_mention',
      title: `@floq mention in ${floq.title}`,
      subtitle: `${senderProfile.display_name}: ${message_content.substring(0, 100)}${message_content.length > 100 ? '...' : ''}`,
      floq_id: floq_id,
      message_id: message_id,
    })) || [];

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from('user_notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
        return new Response(
          JSON.stringify({ error: 'Failed to create notifications' }),
          { status: 500, headers: corsHeaders }
        );
      }

      console.log(`✅ Created ${notifications.length} floq mention notifications`);
    }

    // Log the activity for analytics
    await supabase.from('flock_history').insert({
      floq_id: floq_id,
      user_id: sender_id,
      event_type: 'floq_mentioned',
      metadata: {
        message_id: message_id,
        participant_count: participants?.length || 0,
        mention_type: '@floq'
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: notifications.length,
        floq_title: floq.title
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in floq-mention-handler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);