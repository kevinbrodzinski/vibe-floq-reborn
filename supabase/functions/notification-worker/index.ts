import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get pending notifications from the queue
    const { data: notifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at')
      .limit(50) // Process in batches

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError)
      return new Response('Error fetching notifications', { status: 500, headers: corsHeaders })
    }

    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let processed = 0
    
    for (const notification of notifications) {
      try {
        // Process different notification types
        if (notification.event_type === 'floq_mention') {
          await processFloqMention(notification, supabase)
        } else if (notification.event_type === 'plan_rsvp') {
          await processPlanRsvp(notification, supabase)
        }

        // Mark as processed
        await supabase
          .from('notification_queue')
          .update({ 
            status: 'processed', 
            processed_at: new Date().toISOString() 
          })
          .eq('id', notification.id)

        processed++
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error)
        
        // Mark as failed
        await supabase
          .from('notification_queue')
          .update({ 
            status: 'failed', 
            processed_at: new Date().toISOString() 
          })
          .eq('id', notification.id)
      }
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in notification worker:', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
})

async function processFloqMention(notification: any, supabase: any) {
  const { sender_id, floq_id, content } = notification.payload
  
  // Get sender and floq details for the push notification
  const [senderResult, floqResult] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', sender_id).single(),
    supabase.from('floqs').select('title').eq('id', floq_id).single()
  ])

  if (senderResult.error || floqResult.error) {
    console.error('Error fetching notification details:', senderResult.error || floqResult.error)
    return
  }

  const senderName = senderResult.data?.display_name || 'Someone'
  const floqTitle = floqResult.data?.title || 'a floq'

  // Here you would integrate with your push notification service
  // For now, we'll just log the notification
  console.log('📢 Floq Mention Notification:', {
    user_id: notification.user_id,
    title: `@floq in ${floqTitle}`,
    body: `${senderName}: ${content.substring(0, 100)}...`,
    data: {
      type: 'floq_mention',
      floq_id,
      sender_id
    }
  })
}

async function processPlanRsvp(notification: any, supabase: any) {
  const { plan_title, floq_title, action, user_id } = notification.payload
  
  // Get user details
  const { data: user, error } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user_id)
    .single()

  if (error) {
    console.error('Error fetching user details:', error)
    return
  }

  const userName = user?.display_name || 'Someone'
  const actionText = action === 'joined' ? 'joined' : 'left'

  // Log the notification (replace with actual push service)
  console.log('📅 Plan RSVP Notification:', {
    user_id: notification.user_id,
    title: `Plan Update: ${plan_title}`,
    body: `${userName} ${actionText} your plan in ${floq_title}`,
    data: {
      type: 'plan_rsvp',
      plan_id: notification.payload.plan_id,
      action
    }
  })
}