
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  InfiniteData,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { extractMentions } from '@/utils/mentionParser'

export interface FloqMessage {
  id: string
  body: string
  created_at: string
  sender_id: string
  sender: {              // ← explicit alias
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

export function useFloqMessages(floqId: string) {
  const queryClient = useQueryClient()
  
  const query = useInfiniteQuery({
    queryKey: ['floq-messages', floqId],
    queryFn: async ({ pageParam = 0 }): Promise<FloqMessage[]> => {
      const limit = 20
      const offset = pageParam * limit

      /**
       * Explicit relationship path:
       *   profiles.id  ⇐ floq_messages.sender_id FK
       * Give it an alias ("sender") so it's deterministic.
       */
      const { data, error } = await supabase
        .from('floq_messages')
        .select(
          `
            id,
            body,
            created_at,
            sender_id,
            sender:profiles!floq_messages_sender_id_fkey (
              id, username, display_name, avatar_url
            )
          `
        )
        .eq('floq_id', floqId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return data as unknown as FloqMessage[]
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined
    },
    enabled: !!floqId,
  })

  // Real-time subscription using broadcast (like DM system)
  useEffect(() => {
    if (!floqId) return

    const channel = supabase
      .channel(`floq-${floqId}`)
      .on('broadcast', { event: 'message' }, async (payload) => {
        // Fetch sender profile for the new message
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('id', payload.payload.sender_id)
          .single()

        queryClient.setQueryData<InfiniteData<FloqMessage[]>>(
          ['floq-messages', floqId],
          (old) => {
            if (!old) return old
            const pages = [...old.pages]
            if (pages[0]) {
              pages[0] = [{
                id: payload.payload.id,
                body: payload.payload.body || '',
                created_at: payload.payload.created_at,
                sender_id: payload.payload.sender_id,
                sender: senderProfile || null
              }, ...pages[0]]
            }
            return { ...old, pages }
          }
        )
      })
      .subscribe()

    return () => {
      channel.unsubscribe().catch(console.error)
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
      
      // Get current user profile for optimistic update
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', user.user.id)
        .single()

      // Create optimistic message
      const optimisticMessage: FloqMessage = {
        id: `temp-${Date.now()}`,
        body: p.body,
        created_at: new Date().toISOString(),
        sender_id: user.user.id,
        sender: userProfile || null
      }

      // Add optimistic message immediately
      queryClient.setQueryData<InfiniteData<FloqMessage[]>>(
        ['floq-messages', p.floqId],
        (old) => {
          if (!old) return old
          const pages = [...old.pages]
          if (pages[0]) {
            pages[0] = [optimisticMessage, ...pages[0]]
          }
          return { ...old, pages }
        }
      )
      
      // 1️⃣ Insert to database
      const { data, error } = await supabase
        .from('floq_messages')
        .insert({
          floq_id: p.floqId,
          body: p.body,
          emoji: p.emoji ?? null,
          sender_id: user.user.id,
        })
        .select('id, body, created_at, sender_id')
        .single()

      if (error) throw error

      // 2️⃣ Resolve @handles → user ids and insert mentions
      const handles = extractMentions(p.body)
      if (handles.length) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, username')
          .in('username', handles)
        
        if (users?.length) {
          // 3️⃣ Bulk-insert mention rows
          await supabase.from('message_mentions').insert(
            users.map((u) => ({ message_id: data.id, mentioned_user: u.id }))
          )
        }
      }

      // 4️⃣ Broadcast to other clients
      await supabase.channel(`floq-${p.floqId}`).send({
        type: 'broadcast',
        event: 'message',
        payload: data
      })

      return data
    },
    onSuccess: (data, variables) => {
      // Replace optimistic message with real one
      queryClient.setQueryData<InfiniteData<FloqMessage[]>>(
        ['floq-messages', variables.floqId],
        (old) => {
          if (!old) return old
          const pages = [...old.pages]
          if (pages[0]) {
            // Remove optimistic message and add real one
            const filtered = pages[0].filter(msg => !msg.id.startsWith('temp-'))
            const realMessage: FloqMessage = { 
              ...data, 
              sender: pages[0][0]?.sender || null 
            }
            pages[0] = [realMessage, ...filtered]
          }
          return { ...old, pages }
        }
      )
    },
    onError: (_, variables) => {
      // Remove optimistic message on error
      queryClient.setQueryData<InfiniteData<FloqMessage[]>>(
        ['floq-messages', variables.floqId],
        (old) => {
          if (!old) return old
          const pages = [...old.pages]
          if (pages[0]) {
            pages[0] = pages[0].filter(msg => !msg.id.startsWith('temp-'))
          }
          return { ...old, pages }
        }
      )
    }
  })
}
