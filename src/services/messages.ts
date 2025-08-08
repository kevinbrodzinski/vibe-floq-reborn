import pLimit from 'p-limit'
import pThrottle from 'p-throttle'
import { supabase } from '@/integrations/supabase/client'
import { supaFn } from '@/lib/supaFn'

/** Edge function call – updated to handle reply_to_id */
async function sendMessageRPC(payload: { 
  surface: "dm" | "floq" | "plan"; 
  thread_id: string; 
  sender_id: string; 
  content: string; 
  client_id: string;
  reply_to_id?: string | null; // ✅ FIX: Add reply_to_id parameter
}) {
  // Get session for auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("No auth session");

  // ✅ FIX: Pass reply_to_id through to Edge Function
  const res = await supaFn("send-message", session.access_token, {
    ...payload,
    p_reply_to: payload.reply_to_id ?? null, // Map to Edge Function parameter name
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    const error = new Error(`Failed to send message: ${res.status} ${errorText}`);
    (error as any).status = res.status;
    throw error;
  }
  
  return res.json();
}

/** Allow only N concurrent calls & queue the rest */
const limit = pLimit(2);              // 2 parallel, change to taste

/** Throttle to max 1 message per 750ms to prevent burst flooding */
const throttle = pThrottle({ limit: 1, interval: 750 });

const throttledSendMessage = throttle(sendMessageRPC);

export function limitedSendMessage(input: Parameters<typeof sendMessageRPC>[0]) {
  return limit(() => throttledSendMessage(input));
}