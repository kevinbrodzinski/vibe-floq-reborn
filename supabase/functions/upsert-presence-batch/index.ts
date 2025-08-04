/**
 * Batch presence updates edge function
 * Reduces database load by processing multiple presence updates at once
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PresenceUpdate {
  lat: number;
  lng: number;
  vibe: string;
  timestamp: number;
}

interface BatchRequest {
  updates: PresenceUpdate[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Parse request body
    const { updates }: BatchRequest = await req.json();
    
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      throw new Error('Invalid updates array');
    }

    console.log(`Processing batch of ${updates.length} presence updates for user ${user.id}`);

    // Use the latest update from the batch
    const latest = updates[updates.length - 1];
    
    // Call the existing upsert_presence function
    const { error: upsertError } = await supabase.rpc('upsert_presence', {
      p_lat: latest.lat,
      p_lng: latest.lng,
      p_vibe: latest.vibe,
      p_visibility: 'public'
    });

    if (upsertError) {
      throw new Error(`Presence upsert failed: ${upsertError.message}`);
    }

    console.log(`✅ Batch presence update successful for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: updates.length,
        latest_position: { lat: latest.lat, lng: latest.lng, vibe: latest.vibe }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Batch presence update error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});