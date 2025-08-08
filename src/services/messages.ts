import pLimit from 'p-limit'
import pThrottle from 'p-throttle'
import { supabase } from '@/integrations/supabase/client';

type SendArgs = {
  threadId: string;
  senderId: string;       // profiles.id (same as auth user id in your setup)
  body: string;
  replyTo?: string | null;
  media?: any | null;     // jsonb if you add uploads later
  type?: 'text' | 'image' | 'video'; // must match dm_msg_type
};

export async function sendMessageRPC({
  threadId, senderId, body, replyTo = null, media = null, type = 'text',
}: SendArgs): Promise<string> {
  const { data, error } = await supabase.rpc('send_dm_message_uuid', {
    p_thread_id: threadId,
    p_sender_id: senderId,
    p_body: body,
    p_reply_to: replyTo,
    p_media: media,
    p_type: type,
  });

  if (error) {
    // Helpful logs during setup
    console.error('[sendMessageRPC] RPC error', error);
    throw new Error(error.message || 'Failed to send message');
  }
  // data is the new message id (uuid)
  return data as string;
}

/** Allow only N concurrent calls & queue the rest */
const limit = pLimit(2);              // 2 parallel, change to taste

/** Throttle to max 1 message per 750ms to prevent burst flooding */
const throttle = pThrottle({ limit: 1, interval: 750 });

const throttledSendMessage = throttle(sendMessageRPC);

export function limitedSendMessage(input: Parameters<typeof sendMessageRPC>[0]) {
  return limit(() => throttledSendMessage(input));
}