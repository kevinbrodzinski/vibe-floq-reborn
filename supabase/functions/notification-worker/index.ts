import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { logger } from '../_shared/logger.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface NotificationQueueRow {
  id: string;
  user_id: string;
  event_type: string;
  payload: any;
  status: string;
  created_at: string;
}

interface ExpoPushMessage {
  to: string;
  sound?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Process floq mention notifications
async function processFloqMention(row: NotificationQueueRow) {
  const { payload, user_id, id } = row;
  const { floq_id, message_id, sender_id, content } = payload;

  logger.info('Processing floq mention', { 
    notification_id: id, 
    user_id, 
    floq_id, 
    sender_id 
  });

  try {
    // 1. Get recipient's push token and profile
    const { data: recipient } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', user_id)
      .maybeSingle();

    // 2. Get sender display name and floq title
    const [{ data: sender }, { data: floq }] = await Promise.all([
      supabase.from('profiles').select('display_name').eq('id', sender_id).single(),
      supabase.from('floqs').select('title').eq('id', floq_id).single()
    ]);

    // 3. Send push notification if user has a token
    if (recipient?.push_token) {
      const push: ExpoPushMessage = {
        to: recipient.push_token,
        sound: 'default',
        title: `${sender?.display_name ?? 'Someone'} mentioned @floq`,
        body: floq?.title ?? 'Open the conversation',
        data: {
          floq_id,
          message_id,
          type: 'floq_mention'
        }
      };

      await sendPush(push);
    }

    // 4. Insert in-app notification
    await supabase.from('user_notifications').insert({
      user_id,
      kind: 'floq_mention',
      floq_id,
      message_id,
      title: `${sender?.display_name} pinged everyone`,
      subtitle: content.substring(0, 90)
    });

    // 5. Mark as processed
    await supabase
      .from('notification_queue')
      .update({ status: 'done', processed_at: new Date().toISOString() })
      .eq('id', id);

    logger.info('Floq mention processed successfully', { notification_id: id });

  } catch (error) {
    logger.error('Failed to process floq mention', error as Error, { 
      notification_id: id,
      user_id,
      floq_id 
    });
    
    // Mark as failed
    await supabase
      .from('notification_queue')
      .update({ status: 'failed', processed_at: new Date().toISOString() })
      .eq('id', id);
  }
}

// Process plan RSVP notifications
async function processPlanRsvp(row: NotificationQueueRow) {
  const { payload, user_id, id } = row;
  const { plan_id, plan_title, floq_title, user_id: actor_id, action } = payload;

  logger.info('Processing plan RSVP', { 
    notification_id: id, 
    user_id, 
    plan_id, 
    action 
  });

  try {
    // 1. Get recipient's push token
    const { data: recipient } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', user_id)
      .maybeSingle();

    // 2. Get actor's display name
    const { data: actor } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', actor_id)
      .single();

    // 3. Send push notification if user has a token
    if (recipient?.push_token) {
      const push: ExpoPushMessage = {
        to: recipient.push_token,
        sound: 'default',
        title: `Plan RSVP Update`,
        body: `${actor?.display_name ?? 'Someone'} ${action} "${plan_title}"`,
        data: {
          plan_id,
          floq_title,
          type: 'plan_rsvp'
        }
      };

      await sendPush(push);
    }

    // 4. Insert in-app notification
    await supabase.from('user_notifications').insert({
      user_id,
      kind: 'plan_rsvp',
      plan_id,
      title: `Plan ${action}`,
      subtitle: `${actor?.display_name} ${action} "${plan_title}"`
    });

    // 5. Mark as processed
    await supabase
      .from('notification_queue')
      .update({ status: 'done', processed_at: new Date().toISOString() })
      .eq('id', id);

    logger.info('Plan RSVP processed successfully', { notification_id: id });

  } catch (error) {
    logger.error('Failed to process plan RSVP', error as Error, { 
      notification_id: id,
      user_id,
      plan_id 
    });
    
    // Mark as failed
    await supabase
      .from('notification_queue')
      .update({ status: 'failed', processed_at: new Date().toISOString() })
      .eq('id', id);
  }
}

// Send push notification via Expo
async function sendPush(msg: ExpoPushMessage) {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    });

    const body = await res.json();
    
    if (body.data?.status === 'error') {
      logger.error('Expo push error', new Error(body.data.message || 'Push failed'), {
        push_token: msg.to,
        error_details: body.data
      });
    } else {
      logger.info('Push notification sent successfully', { push_token: msg.to });
    }
  } catch (error) {
    logger.error('Push notification failed', error as Error, { push_token: msg.to });
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    logger.info('Notification worker started');

    // Fetch pending notifications (limit to prevent timeout)
    const { data: notifications, error } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    if (!notifications || notifications.length === 0) {
      logger.info('No pending notifications to process');
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    logger.info(`Processing ${notifications.length} notifications`);

    // Process each notification
    const results = await Promise.allSettled(
      notifications.map(async (row: NotificationQueueRow) => {
        switch (row.event_type) {
          case 'floq_mention':
            await processFloqMention(row);
            break;
          case 'plan_rsvp':
            await processPlanRsvp(row);
            break;
          default:
            logger.warn(`Unknown event type: ${row.event_type}`, { notification_id: row.id });
            // Mark unknown events as done to prevent infinite retries
            await supabase
              .from('notification_queue')
              .update({ status: 'done', processed_at: new Date().toISOString() })
              .eq('id', row.id);
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    const duration = Date.now() - startTime;
    logger.info('Notification processing complete', {
      total: notifications.length,
      successful,
      failed,
      duration_ms: duration
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed: notifications.length,
        successful,
        failed,
        duration_ms: duration
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Notification worker failed', error as Error, { duration_ms: duration });

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});