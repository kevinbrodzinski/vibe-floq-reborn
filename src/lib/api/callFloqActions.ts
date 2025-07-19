
import { supabase } from '@/integrations/supabase/client'

type FloqAction = 'boost' | 'mention'

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

export async function callFloqActions(
  action: FloqAction,
  payload: BoostPayload | MentionPayload
) {
  const { data, error } = await supabase.functions.invoke('floq-actions', {
    body: { 
      action, 
      ...payload 
    },
  })

  if (error) throw error
  return data
}

// Legacy compatibility exports
export const callFloqBoost = (payload: BoostPayload) =>
  callFloqActions('boost', payload)

export const callFloqMentionHandler = (payload: MentionPayload) =>
  callFloqActions('mention', payload)
