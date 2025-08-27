import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

type MentionRow = Database['public']['Tables']['floq_message_mentions']['Row']
type MsgRow     = Database['public']['Tables']['floq_messages']['Row']
type Profile    = Database['public']['Tables']['profiles']['Row']

type MentionJoin = Pick<MentionRow,'message_id'|'created_at'> & {
  floq_messages: Pick<MsgRow,'id'|'body'|'floq_id'|'sender_id'|'created_at'> | null
}

export type MentionNotification = {
  message_id: string
  created_at: string
  body: string
  floq_id: string
  sender_id: string
}

export function useMentionNotifications(targetId: string) {
  return useQuery<MentionNotification[]>({
    queryKey: ['mentions:notifications', targetId],
    enabled: !!targetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floq_message_mentions')
        .select(`
          message_id,
          created_at,
          floq_messages:message_id (
            id, body, floq_id, sender_id, created_at
          )
        `)
        .eq('target_id', targetId as any)
        .returns<MentionJoin[]>()
      if (error) throw error

      const rows = (data ?? []).filter((r) => r.floq_messages)
      return rows.map((r) => ({
        message_id: r.message_id as string,
        created_at: r.created_at as string,
        body: r.floq_messages!.body ?? '',
        floq_id: r.floq_messages!.floq_id as string,
        sender_id: r.floq_messages!.sender_id as string,
      }))
    },
  })
}