
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BoostPayload {
  floq_id: string
  user_id: string
  boost_type?: 'vibe' | 'activity'
}

interface MentionPayload {
  floq_id: string
  sender_id: string
  message_content: string
  message_id: string
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
    const { action } = body

    if (action === 'boost') {
      const { floq_id, boost_type = 'vibe' } = body as BoostPayload
      
      if (!floq_id) {
        return new Response(JSON.stringify({ error: 'Missing floq_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Rate limiting: Check boost count in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('floq_boosts')
        .select('*', { head: true, count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', oneHourAgo)

      if (count && count >= 60) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded: maximum 60 boosts per hour' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Create boost
      const { data, error } = await supabase
        .from('floq_boosts')
        .insert({
          floq_id,
          user_id: user.id,
          boost_type,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
        })
        .select()
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ 
        success: true, 
        boost: data 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (action === 'mention') {
      const { floq_id, sender_id, message_content, message_id } = body as MentionPayload
      
      if (!floq_id || !sender_id || !message_id) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Get floq participants (excluding sender)
      const { data: participants } = await supabase
        .from('floq_participants')
        .select('user_id')
        .eq('floq_id', floq_id)
        .neq('user_id', sender_id)

      if (!participants || participants.length === 0) {
        return new Response(JSON.stringify({ 
          success: true, 
          notifications_sent: 0 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Get sender profile for notification
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', sender_id)
        .single()

      // Create notifications for all participants
      const notifications = participants.map(participant => ({
        user_id: participant.user_id,
        kind: 'floq_mention',
        title: `@floq mention`,
        subtitle: `${senderProfile?.display_name || 'Someone'}: ${message_content.substring(0, 100)}${message_content.length > 100 ? '...' : ''}`,
        floq_id: floq_id,
        message_id: message_id,
      }))

      const { error: notificationError } = await supabase
        .from('user_notifications')
        .insert(notifications)

      if (notificationError) {
        return new Response(JSON.stringify({ error: notificationError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ 
        success: true, 
        notifications_sent: notifications.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('Floq actions error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
