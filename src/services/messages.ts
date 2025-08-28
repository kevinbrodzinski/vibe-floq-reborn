import pLimit from 'p-limit'
import pThrottle from 'p-throttle'
import { supabase } from '@/integrations/supabase/client';

export async function sendMessageRPC(params: {
  threadId: string;
  senderId: string;     // profiles.id of the current user
  body: string;
  replyTo?: string | null;
  media?: any | null;   // keep null for now
  type?: 'text' | 'image' | 'voice' | 'file'; // maps to dm_msg_type
}) {
  const { threadId, senderId, body, replyTo, media = null, type = 'text' } = params;

  const { data, error } = await supabase.rpc('send_dm_message_uuid', {
    p_thread_id: threadId,
    p_sender_id: senderId,
    p_body: body,
    p_reply_to: replyTo ?? null,
    p_media: media,
    p_type: type
  });

  if (error) throw error;
  return data; // this is ONE direct_messages row
}

/** Allow only N concurrent calls & queue the rest */
const limit = pLimit(2);              // 2 parallel, change to taste

/** Throttle to max 1 message per 750ms to prevent burst flooding */
const throttle = pThrottle({ limit: 1, interval: 750 });

const throttledSendMessage = throttle(sendMessageRPC);

export function limitedSendMessage(input: Parameters<typeof sendMessageRPC>[0]) {
  return limit(() => throttledSendMessage(input));
}