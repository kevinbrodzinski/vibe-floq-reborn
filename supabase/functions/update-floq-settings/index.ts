import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Parse request body
    const { floq_id, ...settings } = await req.json()
    
    if (!floq_id) {
      return new Response(
        JSON.stringify({ error: 'Missing floq_id' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if user is creator or co-admin
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('floq_participants')
      .select('role')
      .eq('floq_id', floq_id)
      .eq('user_id', user.id)
      .single()

    if (participantError || !participant || !['creator', 'co-admin'].includes(participant.role)) {
      return new Response(
        JSON.stringify({ error: 'Access denied: Only creators and co-admins can update settings' }),
        { status: 403, headers: corsHeaders }
      )
    }

    // Validate settings structure with proper enum checks
    const validSettings: any = {}
    if (typeof settings.notifications_enabled === 'boolean') {
      validSettings.notifications_enabled = settings.notifications_enabled
    }
    if (['all', 'co-admins', 'host-only'].includes(settings.mention_permissions)) {
      validSettings.mention_permissions = settings.mention_permissions
    }
    if (typeof settings.join_approval_required === 'boolean') {
      validSettings.join_approval_required = settings.join_approval_required
    }
    if (['public', 'members_only'].includes(settings.activity_visibility)) {
      validSettings.activity_visibility = settings.activity_visibility
    }
    if (typeof settings.welcome_message === 'string' || settings.welcome_message === null) {
      // Validate length constraint
      if (settings.welcome_message && settings.welcome_message.length > 300) {
        return new Response(
          JSON.stringify({ error: 'Welcome message must be 300 characters or less' }),
          { status: 422, headers: corsHeaders }
        )
      }
      validSettings.welcome_message = settings.welcome_message
    }

    // Upsert settings and return updated row
    const { data: updatedSettings, error } = await supabaseAdmin
      .from('floq_settings')
      .upsert({
        floq_id,
        ...validSettings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to update settings' }),
        { status: 500, headers: corsHeaders }
      )
    }

    return new Response(JSON.stringify(updatedSettings), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})