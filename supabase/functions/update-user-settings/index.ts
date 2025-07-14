import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_TEMPLATES = [
  'casual-hangout',
  'professional-meetup',
  'event-based',
  'study-group',
  'creative-collab',
  'support-group',
] as const

interface UpdateUserSettingsRequest {
  preferred_welcome_template?: string;
  notification_preferences?: Record<string, any>;
  privacy_settings?: Record<string, any>;
  theme_preferences?: Record<string, any>;
  available_until?: string | null;
}

export default serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Authentication error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const updates: UpdateUserSettingsRequest = await req.json()
    console.log('Updating user settings for user:', user.id, 'with:', updates)

    // Validate welcome template if provided
    if (
      updates.preferred_welcome_template !== undefined &&
      !VALID_TEMPLATES.includes(updates.preferred_welcome_template as any)
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid welcome template' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare update data
    const updateData: any = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }

    // Add fields that are provided
    if (updates.preferred_welcome_template !== undefined) {
      updateData.preferred_welcome_template = updates.preferred_welcome_template
    }
    if (updates.notification_preferences !== undefined) {
      updateData.notification_preferences = updates.notification_preferences
    }
    if (updates.privacy_settings !== undefined) {
      updateData.privacy_settings = updates.privacy_settings
    }
    if (updates.theme_preferences !== undefined) {
      updateData.theme_preferences = updates.theme_preferences
    }
    if (updates.available_until !== undefined) {
      updateData.available_until = updates.available_until
    }

    // Upsert user settings
    const { data, error } = await supabaseClient
      .from('user_settings')
      .upsert(updateData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to update settings', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Successfully updated user settings:', data)

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})