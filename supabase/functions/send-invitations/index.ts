
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InternalInvitePayload {
  floq_id: string
  invitee_ids: string[]
}

interface ExternalInvitePayload {
  plan_id: string
  emails: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get user from JWT
    const authSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Use service role for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { type } = body

    if (type === 'internal') {
      const { floq_id, invitee_ids } = body as InternalInvitePayload
      
      if (!floq_id || !Array.isArray(invitee_ids)) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Verify user is participant of the floq
      const { data: participant } = await supabase
        .from('floq_participants')
        .select('role')
        .eq('floq_id', floq_id)
        .eq('user_id', user.id)
        .single()

      if (!participant) {
        return new Response(JSON.stringify({ error: 'Not authorized to invite to this floq' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Create invitations
      const invitations = invitee_ids.map(invitee_id => ({
        floq_id,
        inviter_id: user.id,
        invitee_id,
        status: 'pending'
      }))

      const { data, error } = await supabase
        .from('floq_invitations')
        .insert(invitations)
        .select()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ 
        success: true, 
        invitations_sent: data.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (type === 'external') {
      const { plan_id, emails } = body as ExternalInvitePayload
      
      if (!plan_id || !Array.isArray(emails)) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Verify user has access to the plan
      const { data: planAccess } = await supabase
        .from('floq_plans')
        .select('floq_id')
        .eq('id', plan_id)
        .single()

      if (!planAccess) {
        return new Response(JSON.stringify({ error: 'Plan not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data: participant } = await supabase
        .from('floq_participants')
        .select('role')
        .eq('floq_id', planAccess.floq_id)
        .eq('user_id', user.id)
        .single()

      if (!participant) {
        return new Response(JSON.stringify({ error: 'Not authorized to invite to this plan' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Create external invitations (simplified - in production you'd send emails)
      console.log(`Sending external invitations for plan ${plan_id} to:`, emails)
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `External invitations sent to ${emails.length} recipients` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else {
      return new Response(JSON.stringify({ error: 'Invalid invitation type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('Send invitations error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
