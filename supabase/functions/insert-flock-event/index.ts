import { createClient } from '@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { floq_id, event_type, actor_id, metadata = {} }: EventRequest = await req.json();

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