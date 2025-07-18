import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Expo } from 'https://esm.sh/expo-server-sdk@3.7.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PlanInviteRequest {
  plan_id: string
  user_id: string
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { plan_id, user_id }: PlanInviteRequest = await req.json()
    
    console.log('Processing plan invite notification:', { plan_id, user_id })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const expo = new Expo({ 
      accessToken: Deno.env.get('EXPO_ACCESS_TOKEN')
    })

    // Fetch user profile and plan details
    const [profileResult, planResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('push_token, display_name, full_name')
        .eq('id', user_id)
        .single(),
      supabase
        .from('floq_plans')
        .select('title, planned_at, floqs(title)')
        .eq('id', plan_id)
        .single()
    ])

    if (profileResult.error) {
      console.error('Error fetching profile:', profileResult.error)
      throw new Error('Failed to fetch user profile')
    }

    if (planResult.error) {
      console.error('Error fetching plan:', planResult.error)
      throw new Error('Failed to fetch plan details')
    }

    const profile = profileResult.data
    const plan = planResult.data

    if (!profile?.push_token) {
      console.log('No push token found for user, skipping push notification')
      return new Response(JSON.stringify({ ok: true, skipped: 'no_push_token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // Prepare push notification message
    const displayName = profile.full_name || profile.display_name || 'Someone'
    const planTitle = plan.title || 'Untitled Plan'
    const floqTitle = plan.floqs?.title || 'a floq'

    const messages = [{
      to: profile.push_token,
      title: 'New Plan Invitation! 🎉',
      body: `You've been invited to "${planTitle}" in ${floqTitle}`,
      data: { 
        type: 'plan_invite', 
        plan_id,
        action: 'view_plan'
      },
      sound: 'default',
      badge: 1
    }]

    // Send push notification
    const chunks = expo.chunkPushNotifications(messages)
    const tickets = await Promise.all(
      chunks.map(chunk => expo.sendPushNotificationsAsync(chunk))
    )

    console.log('Push notification sent successfully:', tickets.flat())

    return new Response(JSON.stringify({ 
      ok: true, 
      tickets: tickets.flat(),
      message: 'Push notification sent successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (error: any) {
    console.error('Error in send-plan-invite function:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to send plan invite notification'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
}

serve(handler)