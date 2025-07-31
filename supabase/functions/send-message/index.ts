import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type SendMessagePayload = {
  surface: 'dm' | 'floq' | 'plan';
  thread_id: string;
  sender_id: string;
  content?: string;
  reply_to_id?: string;
  message_type?: 'text' | 'image' | 'voice' | 'file';
  metadata?: any;
  client_id?: string;
};

async function sendMessage(payload: SendMessagePayload) {
  console.log(`[send-message] Processing message for surface=${payload.surface}, thread_id=${payload.thread_id}, sender_id=${payload.sender_id}`);
  
  try {
    let message;
    let tableName = payload.surface === 'dm' ? 'direct_messages' : 'chat_messages';
    
    if (payload.surface === 'dm') {
      // Verify user is a member of the DM thread
      const { data: thread, error: threadError } = await supabase
        .from("direct_threads")
        .select("member_a, member_b")
        .eq("id", payload.thread_id)
        .single();

      if (threadError) {
        console.error(`[send-message] Thread not found:`, threadError);
        throw new Error(`Thread not found: ${threadError.message}`);
      }

      const isMember = thread.member_a === payload.sender_id || thread.member_b === payload.sender_id;
      if (!isMember) {
        throw new Error("User is not a member of this thread");
      }
    } else {
      // For floq/plan, verify participation via participants table
      const participantTable = payload.surface === 'floq' ? 'floq_participants' : 'plan_participants';
      const { data: participant, error: participantError } = await supabase
        .from(participantTable)
        .select("profile_id")
        .eq(payload.surface === 'floq' ? 'floq_id' : 'plan_id', payload.thread_id)
        .eq("profile_id", payload.sender_id)
        .single();

      if (participantError || !participant) {
        throw new Error(`User is not a participant of this ${payload.surface}`);
      }
    }

    // Insert the message
    const messageData = {
      thread_id: payload.thread_id,
      sender_id: payload.sender_id,
      profile_id: payload.sender_id, // Add profile_id for consistency
      content: payload.content || null,
      reply_to_id: payload.reply_to_id || null,
      message_type: payload.message_type || 'text',
      metadata: payload.client_id ? { ...payload.metadata || {}, client_id: payload.client_id } : payload.metadata || {},
      status: 'sent'
    };

    if (payload.surface !== 'dm') {
      // For floq/plan messages, add surface and floq_id/plan_id
      messageData[payload.surface === 'floq' ? 'floq_id' : 'plan_id'] = payload.thread_id;
      messageData.surface = payload.surface;
    }

    const { data: messageResult, error: messageError } = await supabase
      .from(tableName)
      .insert(messageData)
      .select()
      .single();

    if (messageError) {
      console.error(`[send-message] Failed to insert message:`, messageError);
      throw messageError;
    }

    message = messageResult;

    // Update thread metadata for DMs
    if (payload.surface === 'dm') {
      const { data: thread } = await supabase
        .from("direct_threads")
        .select("member_a, member_b")
        .eq("id", payload.thread_id)
        .single();

      if (thread) {
        const recipientId = thread.member_a === payload.sender_id ? thread.member_b : thread.member_a;
        const unreadCol = thread.member_a === payload.sender_id ? 'unread_b' : 'unread_a';

        await supabase
          .from("direct_threads")
          .update({
            last_message_at: new Date().toISOString(),
            [unreadCol]: supabase.raw(`COALESCE(${unreadCol}, 0) + 1`)
          })
          .eq("id", payload.thread_id);
      }
    }

    // Broadcast to realtime channel
    const channelName = `${payload.surface}:${payload.thread_id}`;
    await supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'message_sent',
      payload: { message }
    });

    console.log(`[send-message] Message sent successfully:`, message.id);
    return { success: true, message };

  } catch (error) {
    console.error(`[send-message] Error:`, error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input = await req.json();
    console.log(`[send-message] Received request:`, input);

    // Support both RPC-style parameters and direct parameters
    const payload: SendMessagePayload = {
      surface: input.surface || 'dm', // Default to dm for backwards compatibility
      thread_id: input.p_thread_id || input.thread_id,
      sender_id: input.p_sender_id || input.sender_id,
      content: input.p_body || input.content || input.body,
      reply_to_id: input.p_reply_to_id || input.reply_to_id,
      message_type: input.p_message_type || input.message_type || 'text',
      metadata: input.p_media_meta || input.metadata || {},
      client_id: input.client_id,
    };

    // Validate required parameters
    if (!payload.thread_id || !payload.sender_id) {
      throw new Error("Missing required parameters: thread_id, sender_id");
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(payload.thread_id)) {
      throw new Error(`Invalid thread_id format: ${payload.thread_id}`);
    }
    if (!uuidRegex.test(payload.sender_id)) {
      throw new Error(`Invalid sender_id format: ${payload.sender_id}`);
    }

    const result = await sendMessage(payload);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error(`[send-message] Request failed:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error) 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});