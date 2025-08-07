import pLimit from 'p-limit'
import pThrottle from 'p-throttle'
import { supabase } from '@/integrations/supabase/client'
import { supaFn } from '@/lib/supaFn'

/** Edge function call – unchanged */
async function sendMessageRPC(payload: { 
  surface: "dm" | "floq" | "plan"; 
  thread_id: string; 
  sender_id: string; 
  content: string; 
  client_id: string 
}) {
  // Get session for auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("No auth session");

  const res = await supaFn("send-message", session.access_token, payload);
  
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