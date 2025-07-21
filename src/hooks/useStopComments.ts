import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import { useGuestSession } from '@/hooks/useGuestSession'
import { useEffect } from 'react'

interface UseStopCommentsParams {
  planId: string
  stopId: string
}

export function useStopComments({ planId, stopId }: UseStopCommentsParams) {
  const session = useSession()
  const { guestId, guestName } = useGuestSession()
  const queryClient = useQueryClient()

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['stop-comments', planId, stopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_stop_comments')
        .select('*')
        .eq('plan_id', planId)
        .eq('stop_id', stopId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data.map(comment => ({
        ...comment,
        guest_name: comment.guest_id ? guestName : null
      }))
    },
    enabled: !!planId && !!stopId,
  })

  const { mutateAsync: addComment } = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase
        .from('plan_stop_comments')
        .insert({
          plan_id: planId,
          stop_id: stopId,
          user_id: session?.user?.id || null,
          guest_id: guestId || null,
          text,
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stop-comments', planId, stopId] })
    },
  })

  // Realtime sync
  useEffect(() => {
    if (!planId || !stopId) return

    const channel = supabase
      .channel(`plan-stop-comments-${stopId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plan_stop_comments', filter: `stop_id=eq.${stopId}` },
        () => queryClient.invalidateQueries({ queryKey: ['stop-comments', planId, stopId] })
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [planId, stopId, queryClient])

  return {
    comments,
    isLoading,
    addComment,
  }
}