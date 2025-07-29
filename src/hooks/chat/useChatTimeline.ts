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
        
        // Try to fetch reactions separately (will fail gracefully if table doesn't exist)
        let reactionsData: any[] = [];
        try {
          const messageIds = (data || []).map(msg => msg.id);
          if (messageIds.length > 0) {
            const { data: reactions } = await (supabase as any)
              .from('dm_message_reactions')
              .select('message_id, emoji, profile_id')
              .in('message_id', messageIds);
            reactionsData = reactions || [];
          }
        } catch (e) {
          // Table doesn't exist yet, ignore
        }
        
        return (data || []).map(msg => {
          // Group reactions by emoji for this message
          const msgReactions = reactionsData
            .filter(r => r.message_id === msg.id)
            .reduce((acc: Record<string, string[]>, reaction) => {
              if (!acc[reaction.emoji]) acc[reaction.emoji] = [];
              acc[reaction.emoji].push(reaction.profile_id);
              return acc;
            }, {});
            
          return {
            ...msg,
            reply_to_id: null, // Will be populated after migration
            reactions: msgReactions
          } as ChatMessage;
        }).reverse();
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
          content: msg.body,
          reactions: {} // Floq reactions not implemented yet
        } as ChatMessage)).reverse();
      }
    },
  });

  useEffect(() => {
    if (!threadId) return;
    
    // Determine the correct primary key column based on surface
    const pkCol = 
      surface === 'dm'   ? 'thread_id' :
      surface === 'floq' ? 'floq_id'   :
      'plan_id';
    
    const channel = supabase.channel(`chat_${surface}_${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: surface === 'dm' ? 'direct_messages' : 'chat_messages',
        filter: `${pkCol}=eq.${threadId}`,
      }, (payload) => {
        qc.invalidateQueries({ queryKey });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [surface, threadId, qc, queryKey]);

  // Separate listener for reactions on this thread
  useEffect(() => {
    if (!threadId || surface !== 'dm') return; // Only for DMs currently
    
    const reactionChannel = supabase
      .channel(`dm_reactions_${threadId}`)
      .on('postgres_changes', {
        event: '*',                 // INSERT & DELETE
        schema: 'public',
        table: 'dm_message_reactions',
        // No thread_id filter since reactions table doesn't have it
        // We'll invalidate all reactions for this thread
      }, (payload) => {
        if (import.meta.env.DEV) {
          console.log('🎭 Reaction change detected, invalidating thread:', payload);
        }
        // Invalidate the entire thread to refresh reactions
        qc.invalidateQueries({ queryKey });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reactionChannel);
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