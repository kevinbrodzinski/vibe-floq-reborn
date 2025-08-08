import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range-unit',
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
      // Use the enhanced RPC function that works with profile IDs
      const { error: rpcError } = await supabase
        .rpc('mark_thread_read_enhanced', {
          p_thread_id: thread_id,
          p_profile_id: profile_id
        });

      if (rpcError) {
        console.error(`[mark-thread-read] RPC failed:`, rpcError);
        throw new Error(`Failed to mark thread as read: ${rpcError.message}`);
      }

      console.log(`[mark-thread-read] Successfully marked thread ${thread_id} as read for profile ${profile_id}`);
      return { success: true };
    }
    
    // Handle other surfaces (floq, plan) if needed
    throw new Error(`Surface ${surface} not yet implemented`);
    
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