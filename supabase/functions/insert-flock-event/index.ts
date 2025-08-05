import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

interface EventRequest {
  floq_id: string;
  event_type: 'joined' | 'left' | 'boosted' | 'ended' | 'deleted' | 'plan_created' | 'invited' | 'created' | 'vibe_changed' | 'location_changed' | 'activity_detected' | 'merged' | 'split';
  actor_id?: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request headers
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'content-type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with user auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'content-type': 'application/json' } 
        }
      );
    }

    // Parse JSON with error handling
    let requestData: EventRequest;
    try {
      requestData = await req.json();
    } catch (jsonError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'content-type': 'application/json' } 
        }
      );
    }

    const { floq_id, event_type, metadata = {} } = requestData;

    // Validate required fields
    if (!floq_id || !event_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: floq_id and event_type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'content-type': 'application/json' } 
        }
      );
    }

    // Validate event type
    const validEventTypes = [
      'joined', 'left', 'boosted', 'ended', 'deleted', 'plan_created', 'invited',
      'created', 'vibe_changed', 'location_changed', 'activity_detected', 'merged', 'split'
    ];
    
    if (!validEventTypes.includes(event_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid event_type: ${event_type}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'content-type': 'application/json' } 
        }
      );
    }

    // Use authenticated user's ID as actor
    const actor_id = user.id;

    // Insert the event into flock_history
    const { data, error } = await supabase
      .from('flock_history')
      .insert({
        floq_id,
        event_type,
        user_id: actor_id,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to insert event', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'content-type': 'application/json' } 
        }
      );
    }

    // Log successful event insertion
    console.log(`Event inserted successfully:`, {
      event_id: data.id,
      floq_id,
      event_type,
      actor_id
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        message: `Event '${event_type}' recorded successfully` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'content-type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'content-type': 'application/json' } 
      }
    );
  }
});