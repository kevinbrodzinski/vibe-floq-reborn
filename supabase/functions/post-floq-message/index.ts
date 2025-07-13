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

    
    const { floq_id, body, emoji } = await req.json();

    // Validate input
    if (!floq_id) {
      throw new Error('Floq ID is required');
    }

    if (!body?.trim() && !emoji?.trim()) {
      throw new Error('Either body or emoji is required');
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

    // Insert the message
    const { data: message, error: messageError } = await supabase
      .from('floq_messages')
      .insert({
        floq_id,
        sender_id: user.id,
        body: body?.trim() || null,
        emoji: emoji?.trim() || null,
      })
      .select(`
        id,
        floq_id,
        sender_id,
        body,
        emoji,
        created_at,
        profiles!inner (
          display_name,
          avatar_url,
          username
        )
      `)
      .single();

    if (messageError) {
      console.error('Message insert error:', messageError);
      throw new Error('Failed to send message');
    }

    // Format the response
    const formattedMessage = {
      id: message.id,
      floq_id: message.floq_id,
      sender_id: message.sender_id,
      body: message.body || undefined,
      emoji: message.emoji || undefined,
      created_at: message.created_at,
      sender: {
        display_name: message.profiles.display_name,
        avatar_url: message.profiles.avatar_url || undefined,
        username: message.profiles.username || undefined,
      },
    };

    return new Response(
      JSON.stringify({ success: true, message: formattedMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in post-floq-message function:', error);
    
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