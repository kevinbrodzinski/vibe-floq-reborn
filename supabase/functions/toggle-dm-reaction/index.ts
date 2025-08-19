import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range, range-unit',
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type ToggleReactionPayload = {
  message_id: string;
  profile_id: string;
  emoji: string;
};

async function toggleDMReaction(payload: ToggleReactionPayload) {
  console.log(`[toggle-dm-reaction] Processing reaction: message_id=${payload.message_id}, profile_id=${payload.profile_id}, emoji=${payload.emoji}`);
  
  try {
    // 1. Verify the message exists and user has access to it
    const { data: message, error: messageError } = await supabase
      .from("direct_messages")
      .select(`
        id,
        thread_id,
        direct_threads!inner(member_a, member_b)
      `)
      .eq("id", payload.message_id)
      .single();

    if (messageError) {
      console.error(`[toggle-dm-reaction] Message not found:`, messageError);
      throw new Error(`Message not found: ${messageError.message}`);
    }

    // Check if user is a member of the thread
    const thread = (message as any).direct_threads;
    const isMember = thread.member_a === payload.profile_id || thread.member_b === payload.profile_id;
    
    if (!isMember) {
      throw new Error("User is not a member of this thread");
    }

    // 2. Check if reaction already exists
    const { data: existingReaction, error: checkError } = await supabase
      .from("dm_message_reactions")
      .select("*")
      .eq("message_id", payload.message_id)
      .eq("profile_id", payload.profile_id)
      .eq("emoji", payload.emoji)
      .maybeSingle();

    if (checkError) {
      console.error(`[toggle-dm-reaction] Error checking existing reaction:`, checkError);
      throw checkError;
    }

    let result;
    
    if (existingReaction) {
      // 3a. Remove existing reaction
      const { error: deleteError } = await supabase
        .from("dm_message_reactions")
        .delete()
        .eq("message_id", payload.message_id)
        .eq("profile_id", payload.profile_id)
        .eq("emoji", payload.emoji);

      if (deleteError) {
        console.error(`[toggle-dm-reaction] Failed to remove reaction:`, deleteError);
        throw deleteError;
      }

      console.log(`[toggle-dm-reaction] Reaction removed successfully`);
      result = { success: true, action: 'removed' };

    } else {
      // 3b. Add new reaction
      const { error: insertError } = await supabase
        .from("dm_message_reactions")
        .insert({
          message_id: payload.message_id,
          profile_id: payload.profile_id,
          emoji: payload.emoji,
        });

      if (insertError) {
        console.error(`[toggle-dm-reaction] Failed to add reaction:`, insertError);
        throw insertError;
      }

      console.log(`[toggle-dm-reaction] Reaction added successfully`);
      result = { success: true, action: 'added' };
    }

    return result;

  } catch (error) {
    console.error(`[toggle-dm-reaction] Error:`, error);
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
    console.log(`[toggle-dm-reaction] Received request:`, input);

    // Support both RPC-style parameters and direct parameters
    const payload: ToggleReactionPayload = {
      message_id: input.p_message_id || input.message_id,
      profile_id: input.p_user_id || input.p_profile_id || input.user_id || input.profile_id,
      emoji: input.p_emoji || input.emoji,
    };

    // Validate required parameters
    if (!payload.message_id || !payload.profile_id || !payload.emoji) {
      throw new Error("Missing required parameters: message_id, profile_id, emoji");
    }

    const result = await toggleDMReaction(payload);

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
    console.error(`[toggle-dm-reaction] Request failed:`, error);
    
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