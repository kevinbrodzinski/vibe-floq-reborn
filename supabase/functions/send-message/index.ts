import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, respondWithCors } from "../_shared/cors.ts";
import { logInvocation } from "../_shared/edge-logger.ts";

// Zod for input validation
const messageSchema = {
  validate: (data: any) => {
    if (!data.thread_id || typeof data.thread_id !== 'string') {
      throw new Error('thread_id is required and must be a string');
    }
    if (!data.content || typeof data.content !== 'string') {
      throw new Error('content is required and must be a string');
    }
    if (data.content.length > 5000) {
      throw new Error('content must be less than 5000 characters');
    }
    if (data.reply_to_id && typeof data.reply_to_id !== 'string') {
      throw new Error('reply_to_id must be a string if provided');
    }
    if (data.surface && !['dm', 'floq', 'plan'].includes(data.surface)) {
      throw new Error('surface must be dm, floq, or plan if provided');
    }
    return {
      thread_id: data.thread_id,
      content: data.content.trim(),
      reply_to_id: data.reply_to_id || null,
      surface: data.surface || 'dm',
      client_id: data.client_id || null // for optimistic updates
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
        functionName: 'send-message',
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
        functionName: 'send-message',
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
      validatedData = messageSchema.validate(body);
    } catch (err) {
      return respondWithCors({ error: err.message }, 400);
    }

    // Check access permissions based on surface type
    let hasAccess = false;
    
    if (validatedData.surface === 'dm') {
      // Check if user is member of direct thread
      const { data: threadAccess } = await supabase
        .from('direct_threads')
        .select('id')
        .eq('id', validatedData.thread_id)
        .or(`member_a.eq.${user.id},member_b.eq.${user.id}`)
        .single();
      
      hasAccess = !!threadAccess;
    } else if (validatedData.surface === 'floq') {
      // Check if user is participant in floq
      const { data: floqAccess } = await supabase
        .from('floq_participants')
        .select('floq_id')
        .eq('floq_id', validatedData.thread_id)
        .eq('profile_id', user.id)
        .single();
      
      hasAccess = !!floqAccess;
    } else if (validatedData.surface === 'plan') {
      // Check if user has access to plan (creator or floq participant)
      const { data: planAccess } = await supabase.rpc('user_in_floq_or_creator', {
        p_plan_id: validatedData.thread_id,
        p_user_id: user.id
      });
      
      hasAccess = !!planAccess;
    }

    if (!hasAccess) {
      await logInvocation({
        functionName: 'send-message',
        status: 'error',
        durationMs: Date.now() - startTime,
        errorMessage: 'Access denied to thread'
      });
      return respondWithCors({ error: 'Access denied' }, 403);
    }

    // Insert message into appropriate table
    let insertResult;
    
    if (validatedData.surface === 'dm') {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          thread_id: validatedData.thread_id,
          sender_id: user.id,
          profile_id: user.id,
          content: validatedData.content,
          reply_to_id: validatedData.reply_to_id,
          message_type: 'text',
          status: 'sent'
        })
        .select('id, created_at, content, sender_id, profile_id, reply_to_id')
        .single();
      
      if (error) throw error;
      insertResult = data;
    } else if (validatedData.surface === 'floq') {
      const { data, error } = await supabase
        .from('floq_messages')
        .insert({
          floq_id: validatedData.thread_id,
          sender_id: user.id,
          profile_id: user.id,
          body: validatedData.content,
          reply_to_id: validatedData.reply_to_id,
          status: 'sent'
        })
        .select('id, created_at, body, sender_id, profile_id, reply_to_id, floq_id')
        .single();
      
      if (error) throw error;
      insertResult = data;
    } else if (validatedData.surface === 'plan') {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: validatedData.thread_id,
          sender_id: user.id,
          profile_id: user.id,
          body: validatedData.content,
          reply_to_id: validatedData.reply_to_id,
          surface: 'plan'
        })
        .select('id, created_at, body, sender_id, profile_id, reply_to_id, thread_id')
        .single();
      
      if (error) throw error;
      insertResult = data;
    }

    // Broadcast real-time update to thread subscribers
    const channelName = `${validatedData.surface}:${validatedData.thread_id}`;
    await supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'message_sent',
      payload: {
        message: insertResult,
        client_id: validatedData.client_id, // for optimistic update reconciliation
        surface: validatedData.surface
      }
    });

    // Queue push notification (fire and forget)
    try {
      await supabase.functions.invoke('push-notification-sender', {
        body: {
          surface: validatedData.surface,
          thread_id: validatedData.thread_id,
          message_id: insertResult.id,
          sender_id: user.id
        }
      });
    } catch (pushError) {
      console.warn('Push notification failed:', pushError);
      // Don't fail the request if push fails
    }

    await logInvocation({
      functionName: 'send-message',
      status: 'success',
      durationMs: Date.now() - startTime,
      metadata: {
        surface: validatedData.surface,
        thread_id: validatedData.thread_id,
        message_id: insertResult.id
      }
    });

    return respondWithCors({
      message: insertResult,
      success: true
    });

  } catch (error) {
    await logInvocation({
      functionName: 'send-message',
      status: 'error',
      durationMs: Date.now() - startTime,
      errorMessage: error.message
    });

    console.error('Send message error:', error);
    return respondWithCors({ 
      error: 'Internal server error',
      message: error.message 
    }, 500);
  }
});