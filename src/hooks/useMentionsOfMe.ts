import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

type MentionRow = Database['public']['Tables']['floq_message_mentions']['Row']
type MsgRow     = Database['public']['Tables']['floq_messages']['Row']

type MentionJoin = Pick<MentionRow,'message_id'|'created_at'|'target_id'|'target_type'> & {
  floq_messages: Pick<MsgRow,'id'|'body'|'floq_id'|'sender_id'|'created_at'> | null
}

export type MentionOfMe = {
  message_id: string
  created_at: string
  floq_id: string
  sender_id: string
  body: string
}

export function useMentionsOfMe(myProfileId: string) {
  return useQuery<MentionOfMe[]>({
    queryKey: ['mentions:ofMe', myProfileId],
    enabled: !!myProfileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floq_message_mentions')
        .select(`
          message_id,
          created_at,
          target_id,
          target_type,
          floq_messages:message_id ( id, body, floq_id, sender_id, created_at )
        `)
        .eq('target_id',   myProfileId as any)
        .eq('target_type', 'profile'   as any)
        .order('created_at', { ascending: false })
        .returns<MentionJoin[]>()
      if (error) throw error

      const rows = (data ?? []).filter((r) => r.floq_messages)
      return rows.map((r) => ({
        message_id: r.message_id as string,
        created_at: r.created_at as string,
        floq_id: r.floq_messages!.floq_id as string,
        sender_id: r.floq_messages!.sender_id as string,
        body: r.floq_messages!.body ?? '',
      }))
    },
  })
}