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

type Payload = {
  surface: "dm" | "floq" | "plan";
  thread_id: string;
  profile_id: string;
};

async function markThreadRead({ surface, thread_id, profile_id }: Payload) {
  console.log(`[mark-thread-read] Starting for surface=${surface}, thread_id=${thread_id}, profile_id=${profile_id}`);
  
  try {
    if (surface === "dm") {
      // For DMs, we need to determine if this user is member_a or member_b
      const { data: thread, error: threadError } = await supabase
        .from("direct_threads")
        .select("member_a, member_b")
        .eq("id", thread_id)
        .single();

      if (threadError) {
        console.error(`[mark-thread-read] Failed to fetch thread:`, threadError);
        throw new Error(`Thread not found: ${threadError.message}`);
      }

      const isMemberA = thread.member_a === profile_id;
      const isMemberB = thread.member_b === profile_id;

      if (!isMemberA && !isMemberB) {
        throw new Error("User is not a member of this thread");
      }

      // Update the appropriate last_read_at and unread columns
      const updateData = isMemberA 
        ? { last_read_at_a: new Date().toISOString(), unread_a: 0 }
        : { last_read_at_b: new Date().toISOString(), unread_b: 0 };

      const { error: updateError } = await supabase
        .from("direct_threads")
        .update(updateData)
        .eq("id", thread_id);

      if (updateError) {
        console.error(`[mark-thread-read] Failed to update direct thread:`, updateError);
        throw updateError;
      }

      console.log(`[mark-thread-read] Successfully updated direct thread for ${isMemberA ? 'member_a' : 'member_b'}`);

    } else if (surface === "floq") {
      // For floq threads, update last_read_at and reset unread count
      const { error: updateError } = await supabase
        .from("floq_threads")
        .update({
          last_read_at: new Date().toISOString(),
          unread: 0
        })
        .eq("id", thread_id)
        .eq("profile_id", profile_id);

      if (updateError) {
        console.error(`[mark-thread-read] Failed to update floq thread:`, updateError);
        throw updateError;
      }

      console.log(`[mark-thread-read] Successfully updated floq thread`);

    } else if (surface === "plan") {
      // For plan threads, update last_read_at and reset unread count
      const { error: updateError } = await supabase
        .from("plan_threads")
        .update({
          last_read_at: new Date().toISOString(),
          unread: 0
        })
        .eq("id", thread_id)
        .eq("profile_id", profile_id);

      if (updateError) {
        console.error(`[mark-thread-read] Failed to update plan thread:`, updateError);
        throw updateError;
      }

      console.log(`[mark-thread-read] Successfully updated plan thread`);
    } else {
      throw new Error(`Invalid surface: ${surface}`);
    }

    return { success: true };

  } catch (error) {
    console.error(`[mark-thread-read] Error:`, error);
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
    console.log(`[mark-thread-read] Received request:`, input);

    // Support both RPC-style parameters and direct parameters
    const payload: Payload = {
      surface: input.p_surface || input.surface,
      thread_id: input.p_thread_id || input.thread_id,
      profile_id: input.p_profile_id || input.profile_id,
    };

    // Validate required parameters
    if (!payload.surface || !payload.thread_id || !payload.profile_id) {
      throw new Error("Missing required parameters: surface, thread_id, profile_id");
    }

    // Validate UUID format for thread_id and profile_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(payload.thread_id)) {
      console.error(`[mark-thread-read] Invalid thread_id format: ${payload.thread_id}`);
      throw new Error(`Invalid thread_id format: ${payload.thread_id}`);
    }
    if (!uuidRegex.test(payload.profile_id)) {
      console.error(`[mark-thread-read] Invalid profile_id format: ${payload.profile_id}`);
      throw new Error(`Invalid profile_id format: ${payload.profile_id}`);
    }

    const result = await markThreadRead(payload);

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
    console.error(`[mark-thread-read] Request failed:`, error);
    
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