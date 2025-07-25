import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Push notification sender started');

    // 1. Fetch tokens that need a push (badge_count > 0)
    const { data: tokens, error } = await supabase
      .from('user_push_tokens')
      .select('user_id, token, badge_count, platform')
      .gt('badge_count', 0);

    if (error) {
      throw new Error(`Failed to fetch push tokens: ${error.message}`);
    }

    if (!tokens || tokens.length === 0) {
      console.log('No tokens with pending notifications');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No pending notifications' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`Found ${tokens.length} tokens with pending notifications`);

    // 2. For now, we'll just log what would be sent
    // In a real implementation, you'd integrate with Expo, FCM, or APNs here
    const notifications = tokens.map(token => ({
      to: token.token,
      badge: token.badge_count,
      title: 'You have new activity',
      body: `You have ${token.badge_count} new notification${token.badge_count === 1 ? '' : 's'}`,
      platform: token.platform,
      data: { kind: 'generic', badge_count: token.badge_count }
    }));

    console.log('Would send notifications:', notifications);

    // 3. Reset badge counts after "sending"
    const userIds = tokens.map(t => t.user_id);
    const { error: resetError } = await supabase
      .from('user_push_tokens')
      .update({ badge_count: 0 })
      .in('user_id', userIds);

    if (resetError) {
      console.error('Error resetting badge counts:', resetError);
    } else {
      console.log('Badge counts reset for users:', userIds);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: notifications.length,
        notifications: notifications,
        message: 'Push notifications processed (simulated)'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Push notification sender failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});