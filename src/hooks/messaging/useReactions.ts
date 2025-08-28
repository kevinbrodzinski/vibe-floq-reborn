import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useCurrentUserId } from '@/hooks/useCurrentUser'

type ReactionSelect = {
  id: string
}

export function useReactions(threadId?: string) {
  const qc = useQueryClient()
  const me = useCurrentUserId()

  return useMutation<{ action: 'added' | 'removed' }, Error, { messageId: string; emoji: string }>({
    mutationFn: async ({ messageId, emoji }) => {
      if (!me) throw new Error('Not authenticated')

      const { data: existing, error: selErr } = await supabase
        .from('dm_message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('profile_id', me)
        .eq('emoji', emoji)
        .maybeSingle()
        .returns<ReactionSelect | null>()
      if (selErr) throw selErr

      if (existing) {
        const { error } = await supabase.from('dm_message_reactions').delete().eq('id', existing.id)
        if (error) throw error
        return { action: 'removed' as const }
      } else {
        const { error } = await supabase.from('dm_message_reactions').insert({
          message_id: messageId,
          profile_id: me,
          emoji,
        })
        if (error) throw error
        return { action: 'added' as const }
      }
    },
    onSuccess: () => {
      if (threadId) qc.invalidateQueries({ queryKey: ['dm:messages', threadId] })
    },
  })
}