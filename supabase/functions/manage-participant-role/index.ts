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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Parse request body
    const { floqId, userId, newRole } = await req.json()

    // Validate required fields
    if (!floqId || !userId || !newRole) {
      return new Response(
        JSON.stringify({ error: 'floqId, userId, and newRole are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate role
    if (!['member', 'co-admin'].includes(newRole)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be member or co-admin' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Call the SQL function with proper error handling
    const { error } = await supabase.rpc('set_participant_role', {
      p_floq_id: floqId,
      p_user_id: userId,
      p_new_role: newRole
    })

    if (error) {
      console.error('Database error:', error)
      
      // Handle specific error cases
      let statusCode = 400
      let errorMessage = error.message

      if (error.message.includes('Access denied')) {
        statusCode = 403
      } else if (error.message.includes('not a participant')) {
        statusCode = 404
      } else if (error.message.includes('Cannot change the role of the floq creator')) {
        statusCode = 403
        errorMessage = 'Cannot change the role of the floq creator'
      } else if (error.message.includes('Cannot demote the last co-admin')) {
        statusCode = 409
        errorMessage = 'Cannot demote the last co-admin. Promote another member first.'
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: statusCode, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

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