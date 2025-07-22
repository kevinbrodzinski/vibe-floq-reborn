
import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { FloqMessageRow } from '@/types/database'

export function useFloqMessages(floqId: string) {
  const queryClient = useQueryClient()
  
  const query = useInfiniteQuery({
    queryKey: ['floq-messages', floqId],
    queryFn: async ({ pageParam = 0 }) => {
      const limit = 20
      const offset = pageParam * limit

      const { data, error } = await supabase
        .from('floq_messages')
        .select(`
          id,
          body,
          emoji,
          created_at,
          sender_id,
          profiles!inner(username, display_name, avatar_url)
        `)
        .eq('floq_id', floqId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
        .returns<FloqMessageRow[]>()

      if (error) throw error

      // Map to expected format
      return (data || []).map(msg => ({
        id: msg.id,
        body: msg.body || '',
        created_at: msg.created_at,
        sender_id: msg.sender_id,
        profiles: msg.profiles
      }))
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined
    },
    enabled: !!floqId,
  })

  // Real-time subscription for new messages
  useEffect(() => {
    if (!floqId) return

    const channel = supabase
      .channel(`floq_messages:floq_id=eq.${floqId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'floq_messages', 
          filter: `floq_id=eq.${floqId}` 
        },
        (payload) => {
          queryClient.setQueryData<InfiniteData<any>>(
            ['floq-messages', floqId],
            (old) => {
              if (!old) return old
              const clone = structuredClone(old)
              // Add new message to the first page (most recent)
              clone.pages[0].unshift({
                id: payload.new.id,
                body: payload.new.body || '',
                created_at: payload.new.created_at,
                sender_id: payload.new.sender_id,
                profiles: null // Will be populated on next refetch if needed
              })
              return clone
            }
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [floqId, queryClient])

  return query
}

export function useSendFloqMessage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (p: { floqId: string; body: string; emoji?: string }) => {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')
      
      const { error } = await supabase.from('floq_messages').insert({
        floq_id: p.floqId,
        body: p.body,
        emoji: p.emoji ?? null,
        sender_id: user.user.id,
      })
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      // Invalidate to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['floq-messages', variables.floqId] })
    }
  })
}
