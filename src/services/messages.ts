import pLimit from 'p-limit'
import pThrottle from 'p-throttle'
import { supabase } from '@/integrations/supabase/client';

export async function sendMessageRPC({
  threadId,
  senderId,           // current user's profile_id
  body,               // message text
  replyTo,            // optional message id
  media,              // optional json (or null)
  type = 'text',      // dm_msg_type enum label (e.g. 'text')
}: {
  threadId: string;
  senderId: string;
  body: string;
  replyTo?: string | null;
  media?: any | null;
  type?: 'text' | 'image' | 'video' | string;
}) {
  const { data, error } = await supabase.rpc('send_dm_message', {
    p_thread_id: threadId,
    p_sender_id: senderId,
    p_body: body,
    p_reply_to: replyTo ?? null,
    p_media: media ?? null,
    p_type: type,          // PostgREST will cast to enum if label exists
  });

  if (error) throw error;   // surface PostgREST errors to the caller
  return data;              // usually the new message id (depends on your fn)
}

/** Allow only N concurrent calls & queue the rest */
const limit = pLimit(2);              // 2 parallel, change to taste

/** Throttle to max 1 message per 750ms to prevent burst flooding */
const throttle = pThrottle({ limit: 1, interval: 750 });

const throttledSendMessage = throttle(sendMessageRPC);

export function limitedSendMessage(input: Parameters<typeof sendMessageRPC>[0]) {
  return limit(() => throttledSendMessage(input));
}