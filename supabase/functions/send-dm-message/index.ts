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

type SendDMPayload = {
  thread_id: string;
  sender_id: string;
  content?: string;
  reply_to_id?: string;
  message_type?: 'text' | 'image' | 'voice' | 'file';
  metadata?: any;
};

async function sendDMMessage(payload: SendDMPayload) {
  console.log(`[send-dm-message] Processing message for thread_id=${payload.thread_id}, sender_id=${payload.sender_id}`);
  
  try {
    // 1. Verify user is a member of the thread
    const { data: thread, error: threadError } = await supabase
      .from("direct_threads")
      .select("member_a, member_b")
      .eq("id", payload.thread_id)
      .single();

    if (threadError) {
      console.error(`[send-dm-message] Thread not found:`, threadError);
      throw new Error(`Thread not found: ${threadError.message}`);
    }

    const isMember = thread.member_a === payload.sender_id || thread.member_b === payload.sender_id;
    if (!isMember) {
      throw new Error("User is not a member of this thread");
    }

    // 2. Insert the message
    const messageData = {
      thread_id: payload.thread_id,
      sender_id: payload.sender_id,
      content: payload.content || null,
      reply_to_id: payload.reply_to_id || null,
      message_type: payload.message_type || 'text',
      metadata: payload.metadata || {},
      status: 'sent'
    };

    const { data: message, error: messageError } = await supabase
      .from("direct_messages")
      .insert(messageData)
      .select()
      .single();

    if (messageError) {
      console.error(`[send-dm-message] Failed to insert message:`, messageError);
      throw messageError;
    }

    // 3. Update thread metadata
    const recipientId = thread.member_a === payload.sender_id ? thread.member_b : thread.member_a;
    const unreadCol = thread.member_a === payload.sender_id ? 'unread_b' : 'unread_a';

    const { error: updateError } = await supabase
      .from("direct_threads")
      .update({
        last_message_at: new Date().toISOString(),
        [unreadCol]: supabase.raw(`COALESCE(${unreadCol}, 0) + 1`)
      })
      .eq("id", payload.thread_id);

    if (updateError) {
      console.error(`[send-dm-message] Failed to update thread:`, updateError);
      // Don't throw here - message was sent successfully
    }

    console.log(`[send-dm-message] Message sent successfully:`, message.id);
    return { success: true, message };

  } catch (error) {
    console.error(`[send-dm-message] Error:`, error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input = await req.json();
    console.log(`[send-dm-message] Received request:`, input);

    // Support both RPC-style parameters and direct parameters
    const payload: SendDMPayload = {
      thread_id: input.p_thread_id || input.thread_id,
      sender_id: input.p_sender_id || input.sender_id,
      content: input.p_body || input.content || input.body,
      reply_to_id: input.p_reply_to_id || input.reply_to_id,
      message_type: input.p_message_type || input.message_type || 'text',
      metadata: input.p_media_meta || input.metadata || {},
    };

    // Validate required parameters
    if (!payload.thread_id || !payload.sender_id) {
      throw new Error("Missing required parameters: thread_id, sender_id");
    }

    const result = await sendDMMessage(payload);

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
    console.error(`[send-dm-message] Request failed:`, error);
    
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