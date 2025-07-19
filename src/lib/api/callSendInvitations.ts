import { supabase } from '@/integrations/supabase/client'

type SendInviteMode = 'internal' | 'external'

interface InternalInvitePayload {
  floq_id: string
  invitee_ids: string[]
}

interface ExternalInvitePayload {
  plan_id: string
  emails: string[]
}

export async function callSendInvitations(
  mode: SendInviteMode,
  payload: InternalInvitePayload | ExternalInvitePayload
) {
  const { data, error } = await supabase.functions.invoke('send-invitations', {
    body: { 
      type: mode, 
      ...payload 
    },
  })

  if (error) throw error
  return data
}

// Legacy compatibility exports
export const callInviteToFloq = (payload: InternalInvitePayload) =>
  callSendInvitations('internal', payload)

export const callInviteExternalFriends = (payload: ExternalInvitePayload) =>
  callSendInvitations('external', payload)