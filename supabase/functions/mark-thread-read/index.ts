import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, respondWithCors } from "../_shared/cors.ts";
import { logInvocation } from "../_shared/edge-logger.ts";

// Input validation schema
const markReadSchema = {
  validate: (data: any) => {
    if (!data.p_surface || !['dm', 'floq', 'plan'].includes(data.p_surface)) {
      throw new Error('p_surface is required and must be dm, floq, or plan');
    }
    if (!data.p_thread_id || typeof data.p_thread_id !== 'string') {
      throw new Error('p_thread_id is required and must be a string');
    }
    if (!data.p_profile_id || typeof data.p_profile_id !== 'string') {
      throw new Error('p_profile_id is required and must be a string');
    }
    return {
      surface: data.p_surface,
      thread_id: data.p_thread_id,
      profile_id: data.p_profile_id
    };
  }
};

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return respondWithCors({ error: 'Method not allowed' }, 405);
    }

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      await logInvocation({
        functionName: 'mark-thread-read',
        status: 'error',
        durationMs: Date.now() - startTime,
        errorMessage: 'Missing or invalid authorization header'
      });
      return respondWithCors({ error: 'Unauthorized' }, 401);
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      await logInvocation({
        functionName: 'mark-thread-read',
        status: 'error',
        durationMs: Date.now() - startTime,
        errorMessage: 'Invalid auth token'
      });
      return respondWithCors({ error: 'Unauthorized' }, 401);
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return respondWithCors({ error: 'Invalid JSON body' }, 400);
    }

    let validatedData;
    try {
      validatedData = markReadSchema.validate(body);
    } catch (err) {
      return respondWithCors({ error: err.message }, 400);
    }

    // Security check: ensure user can only mark their own threads as read
    if (validatedData.profile_id !== user.id) {
      return respondWithCors({ error: 'Can only mark own threads as read' }, 403);
    }

    // Update read status based on surface type
    let updateResult;
    
    if (validatedData.surface === 'dm') {
      // Update direct thread read status
      const { data, error } = await supabase
        .from('direct_threads')
        .update({
          last_read_at_a: validatedData.profile_id === 'member_a' ? new Date().toISOString() : undefined,
          last_read_at_b: validatedData.profile_id === 'member_b' ? new Date().toISOString() : undefined
        })
        .eq('id', validatedData.thread_id)
        .or(`member_a.eq.${user.id},member_b.eq.${user.id}`)
        .select()
        .single();
      
      if (error) throw error;
      updateResult = data;
    } else if (validatedData.surface === 'floq') {
      // Update floq participant read status
      const { data, error } = await supabase
        .from('floq_participants')
        .update({
          last_read_message_at: new Date().toISOString()
        })
        .eq('floq_id', validatedData.thread_id)
        .eq('profile_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      updateResult = data;
    } else if (validatedData.surface === 'plan') {
      // For plan chat, we could create a separate read status table
      // For now, just return success as plan chat is less critical
      updateResult = { success: true };
    }

    // Broadcast read status update
    const channelName = `${validatedData.surface}:${validatedData.thread_id}`;
    await supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'thread_read',
      payload: {
        thread_id: validatedData.thread_id,
        profile_id: validatedData.profile_id,
        surface: validatedData.surface,
        read_at: new Date().toISOString()
      }
    });

    await logInvocation({
      functionName: 'mark-thread-read',
      status: 'success',
      durationMs: Date.now() - startTime,
      metadata: {
        surface: validatedData.surface,
        thread_id: validatedData.thread_id
      }
    });

    return respondWithCors({
      success: true,
      result: updateResult
    });

  } catch (error) {
    await logInvocation({
      functionName: 'mark-thread-read',
      status: 'error',
      durationMs: Date.now() - startTime,
      errorMessage: error.message
    });

    console.error('Mark thread read error:', error);
    return respondWithCors({ 
      error: 'Internal server error',
      message: error.message 
    }, 500);
  }
});