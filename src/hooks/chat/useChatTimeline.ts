import {
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  ChatMessage, PAGE_SIZE, Surface, rpc_markThreadRead
} from '@/lib/chat/api';

export const useChatTimeline = (
  surface: Surface, 
  threadId: string, 
  userId: string,
  options: { enabled?: boolean } = {}
) => {
  const qc = useQueryClient();

  const queryKey = ['chat', surface, threadId];
  const query = useInfiniteQuery<ChatMessage[]>({
    queryKey,
    enabled: options.enabled !== false,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.at(0)?.created_at ?? null,
    queryFn: async ({ pageParam }) => {
      if (surface === 'dm') {
        let q = supabase
          .from('direct_messages')
          .select('id, thread_id, sender_id, content, metadata, created_at')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);

        if (pageParam) q = q.lt('created_at', pageParam);

        const { data, error } = await q;
        if (error) throw error;
        return (data || []).map(msg => ({
          ...msg,
          reply_to_id: null
        } as ChatMessage)).reverse();
      } else {
        let q = supabase
          .from('chat_messages')
          .select('id, thread_id, sender_id, body, metadata, reply_to_id, created_at')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);

        if (pageParam) q = q.lt('created_at', pageParam);

        const { data, error } = await q;
        if (error) throw error;
        return (data || []).map(msg => ({
          ...msg,
          content: msg.body
        } as ChatMessage)).reverse();
      }
    },
  });

  useEffect(() => {
    const channel = supabase.channel(`chat_${surface}_${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: surface === 'dm' ? 'direct_messages' : 'chat_messages',
        filter: `thread_id=eq.${threadId}`,
      }, (payload) => {
        qc.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          const newestPage = old.pages[0];
          if (!newestPage) return old;
          if (newestPage.some((m: ChatMessage) => m.id === payload.new.id)) return old;
          
          const newMsg = surface === 'dm' 
            ? { ...payload.new, reply_to_id: null }
            : { ...payload.new, content: payload.new.body };
          
          newestPage.unshift(newMsg as ChatMessage);
          return { ...old };
        });
      })
      .subscribe();

    // Add debug logging for realtime state  
    console.log('Realtime channel setup completed');

    return () => {
      supabase.removeChannel(channel);
    };
  }, [surface, threadId, qc, queryKey]);

  useEffect(() => {
    if (query.data?.pages?.[0]?.length) {
      rpc_markThreadRead({ 
        p_surface: surface as 'dm' | 'floq' | 'plan', 
        p_thread_id: threadId, 
        p_user_id: userId 
      });
    }
  }, [query.data?.pages?.[0]?.length, surface, threadId, userId]);

  return query;
};