/// <reference lib="deno.unstable" />
// Edge Function: create-profile
// Inserts a new row into public.profiles, enforcing username uniqueness
// and returning the created profile. This function should be invoked by
// the OnboardingCompletionStep after avatar upload + vibe selection.
//
// Route: POST /functions/v1/create-profile
// Security: SECURITY INVOKER – executed with caller's JWT context.
// -------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateProfilePayload {
  username: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  vibe_preference: string;
  interests?: string[];
  email?: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    // Parse JSON body
    const payload: CreateProfilePayload = await req.json();

    // Enhanced field validation with detailed error messages
    const username = payload.username?.trim().toLowerCase();
    const displayName = payload.display_name?.trim();
    const bio = payload.bio?.trim().substring(0, 280) || null; // Trim to 280 chars
    
    // Set avatar_url to empty string if empty or missing to satisfy constraint
    const avatarUrl = payload.avatar_url && payload.avatar_url.trim() ? payload.avatar_url.trim() : '';
    
    console.log('Creating profile with validated data:', {
      user_id: 'pending_auth',
      username: payload.username,
      display_name: payload.display_name,
      has_avatar: !!avatarUrl,
      avatar_type: avatarUrl ? (avatarUrl.includes('supabase.co') ? 'public_url' : 'storage_path') : 'none',
      vibe_preference: payload.vibe_preference,
      interests_count: payload.interests?.length || 0
    });
    
    // Check for missing required fields
    const missingFields = [];
    if (!username) missingFields.push('username');
    if (!displayName) missingFields.push('display_name');
    if (!payload.vibe_preference) missingFields.push('vibe_preference');
    
    // Avatar is optional - don't require it
    // if (!avatarUrl) missingFields.push('avatar_url');
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          missing_fields: missingFields,
          message: `Missing required fields: ${missingFields.join(', ')}`
        }), 
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }
    
    // Additional validation
    if (username.length < 2 || username.length > 30) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid username length', 
          message: 'Username must be between 2 and 30 characters'
        }), 
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }
    
    if (displayName.length < 1 || displayName.length > 50) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid display name length', 
          message: 'Display name must be between 1 and 50 characters'
        }), 
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Initialize Supabase client with request auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { 
          headers: { 
            Authorization: req.headers.get('Authorization')! 
          } 
        },
      }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response('Unauthenticated', { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    // Check username uniqueness (case-insensitive)
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle();

    if (existing) {
      console.error('Username already taken:', username);
      return new Response(
        JSON.stringify({ 
          error: 'Username already taken', 
          message: `Username "${username}" is already taken`
        }), 
        { 
          status: 409, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Check if profile already exists for this user
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile) {
      console.error('Profile already exists for user:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'Profile already exists', 
          message: 'A profile has already been created for this user'
        }), 
        { 
          status: 409, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Build insert payload
    const insertPayload = {
      id: user.id,
      username,
      display_name: displayName,
      bio,
      avatar_url: avatarUrl, // Will be empty string if not provided due to default
      vibe_preference: payload.vibe_preference,
      interests: payload.interests?.length ? payload.interests : [],
      email: payload.email || user.email || null,
      profile_created: true,
    };

    console.log('Final insert payload:', {
      ...insertPayload,
      avatar_url_length: avatarUrl?.length || 0,
      avatar_url_type: avatarUrl ? (avatarUrl.startsWith('data:') ? 'data_url' : 'regular_url') : 'empty'
    });

    // Insert profile - no UPSERT to avoid conflict errors
    const { data, error } = await supabase
      .from('profiles')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('create-profile insert error:', error);
      
      // Map specific error codes with detailed responses
      if (error.code === '23505' || error.code === '409') {
        return new Response(
          JSON.stringify({ 
            error: 'Username already taken', 
            message: `Username "${username}" is already taken`
          }), 
          { 
            status: 409, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Database error', 
          message: error.message,
          code: error.code 
        }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      },
    });

  } catch (error) {
    console.error('create-profile error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
});