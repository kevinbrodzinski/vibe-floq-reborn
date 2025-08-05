
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  InfiniteData,
} from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
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
  reply_to_id?: string   // ID of the message this is replying to
  reply_to?: FloqMessage // The message being replied to (for display)
  thread_count?: number  // Number of replies in this thread
}

export interface TypingIndicator {
  profileId: string
  displayName: string
  timestamp: number
}

export function useFloqMessages(floqId: string) {
  const queryClient = useQueryClient()
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [readReceipts, setReadReceipts] = useState<Record<string, string[]>>({})
  const [messageReactions, setMessageReactions] = useState<Record<string, string[]>>({})
  
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
            reply_to_id,
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

  // Real-time subscription for messages and reactions
  useEffect(() => {
    if (!floqId) return;

    const channel = supabase
      .channel(`floq:${floqId}`)
      // new message
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'floq_messages', filter: `floq_id=eq.${floqId}` },
          () => queryClient.invalidateQueries({ queryKey: ['floq-messages', floqId] }))
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'floq_message_reactions',
            filter: `message_id=in.(select id from public.floq_messages where floq_id='${floqId}')` },
          () => queryClient.invalidateQueries({ queryKey: ['floq-reactions', floqId] }))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [floqId, queryClient]);

  return {
    ...query,
    typingUsers,
    readReceipts,
    messageReactions,
    sendTypingIndicator: (isTyping: boolean) => {},
    sendReaction: (messageId: string, reaction: string, isAdding: boolean) => {},
    sendReadReceipt: (messageId: string) => {}
  }
}

export function useSendFloqMessage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (p: { floqId: string; body: string; replyTo?: string }) => {
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
        sender: userProfile || null,
        reply_to_id: p.replyTo
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
           sender_id: user.user.id,
          reply_to_id: p.replyTo ?? null,
        })
        .select('id, body, created_at, sender_id, reply_to_id')
        .single()

      if (error) throw error

      // Note: Mentions are now handled by the database trigger automatically

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
            const messageData = data as { id: string; body: string; created_at: string; sender_id: string; reply_to_id?: string };
            const realMessage: FloqMessage = { 
              id: messageData.id,
              body: messageData.body,
              created_at: messageData.created_at,
              sender_id: messageData.sender_id,
              sender: pages[0][0]?.sender || null,
              reply_to_id: messageData.reply_to_id
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
