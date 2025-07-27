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
  avatar_url: string;
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

    // Basic field validation
    const username = payload.username?.trim().toLowerCase();
    const displayName = payload.display_name?.trim();
    const bio = payload.bio?.trim().substring(0, 280) || null; // Trim to 280 chars
    
    if (!username || !displayName || !payload.avatar_url || !payload.vibe_preference) {
      return new Response('Missing required fields', { 
        status: 400, 
        headers: corsHeaders 
      });
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
      return new Response('Username already taken', { 
        status: 409, 
        headers: corsHeaders 
      });
    }

    // Build insert payload
    const insertPayload = {
      id: user.id,
      username,
      display_name: displayName,
      bio,
      avatar_url: payload.avatar_url,
      vibe_preference: payload.vibe_preference,
      interests: payload.interests?.length ? payload.interests : [],
      email: payload.email || user.email || null,
      profile_created: true,
    };

    // Insert profile
    const { data, error } = await supabase
      .from('profiles')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('create-profile insert error:', error);
      
      // Map specific error codes
      if (error.code === '23505' || error.code === '409') {
        return new Response('Username already taken', { 
          status: 409, 
          headers: corsHeaders 
        });
      }
      
      return new Response(error.message, { 
        status: 500, 
        headers: corsHeaders 
      });
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
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});