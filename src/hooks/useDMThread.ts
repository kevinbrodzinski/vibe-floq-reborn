import { useEffect, useState, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import throttle from 'lodash.throttle';
import { supabase } from '@/integrations/supabase/client';
import { getEnvironmentConfig, isDemo } from '@/lib/environment';

interface DirectMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  metadata?: any;
  isOptimistic?: boolean; // Flag for optimistic updates
}

export function useDMThread(friendId: string | null) {
  const qc = useQueryClient();
  const [selfId, setSelfId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  /* 1️⃣ cache current user id once – synchronous */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSelfId(data.user?.id ?? null);
    });
  }, []);

  /* 2️⃣ obtain / create the thread */
  const { data: threadId } = useQuery({
    queryKey: ['dm-thread', friendId, selfId],
    enabled: !!friendId && !!selfId,
    queryFn: async () => {
      const env = getEnvironmentConfig();
      
      if (env.presenceMode === 'offline') {
        // Return a mock thread ID for offline mode
        return `offline-thread-${selfId}-${friendId}`;
      }

      const { data, error } = await supabase.rpc('find_or_create_dm', {
        a: selfId,
        b: friendId,
        p_use_demo: isDemo()
      });
      if (error) throw error;
      return data as string;
    },
  });

  /* 3️⃣ messages query */
  const { data: messages = [] } = useQuery({
    queryKey: ['dm-msgs', threadId],
    enabled: !!threadId,
    staleTime: 15_000, // Don't refetch immediately after optimistic update
    queryFn: async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('thread_id', threadId!)
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return data as DirectMessage[];
    },
  });

  /* 4️⃣ send */
  const send = useMutation({
    mutationFn: async (content: string) => {
      if (!threadId) throw new Error('No thread');
      if (!selfId) throw new Error('No auth');

      const { data, error } = await supabase.from('direct_messages').insert({
        thread_id: threadId,
        sender_id: selfId,
        content,
      }).select().single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async (content: string) => {
      if (!threadId || !selfId) return;

      const tempId = `temp-${crypto.randomUUID()}`;
      const optimisticMessage: DirectMessage = {
        id: tempId,
        thread_id: threadId,
        sender_id: selfId,
        content,
        created_at: new Date().toISOString(),
        isOptimistic: true,
      };

      qc.setQueryData<DirectMessage[]>(['dm-msgs', threadId], (old) => [
        ...(old ?? []),
        optimisticMessage,
      ]);
      
      return { tempId };
    },
    onSuccess: (realMessage, content, context) => {
      // Replace optimistic message with real one
      if (context?.tempId && threadId) {
        qc.setQueryData<DirectMessage[]>(['dm-msgs', threadId], (old) => 
          old?.map(msg => 
            msg.id === context.tempId ? { ...realMessage, isOptimistic: false } : msg
          ) ?? []
        );
      }
    },
    onError: (error, content, context) => {
      // Remove failed optimistic message
      if (context?.tempId && threadId) {
        qc.setQueryData<DirectMessage[]>(['dm-msgs', threadId], (old) =>
          old?.filter(msg => msg.id !== context.tempId) ?? []
        );
      }
    },
  });

  /* 5️⃣ realtime – LISTEN to `pg_notify` + typing indicator */
  useEffect(() => {
    if (!threadId) return;
    
    const channel = supabase
      .channel(`dm:${threadId}`)
      .on('broadcast', { event: 'message' }, (payload) => {
        const msg = payload.payload as DirectMessage;
        qc.setQueryData<DirectMessage[]>(['dm-msgs', threadId], (old) => {
          // Skip if already exists (avoids duplicates from optimistic updates)
          if (old?.some((m) => m.id === msg.id)) return old;
          return [...(old ?? []), msg];
        });
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        // Extension point for typing indicators
        if (payload.payload.user_id !== selfId) {
          setIsTyping(true);
          // Auto-clear after 3 seconds
          setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, qc, selfId]);

  // Helper function to send typing indicator (throttled)
  const sendTyping = useCallback(() => {
    if (!threadId || !selfId) return;
    supabase.channel(`dm:${threadId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: selfId }
    });
  }, [threadId, selfId]);

  const throttledTyping = useCallback(
    throttle(() => sendTyping(), 2000, { trailing: false }),
    [sendTyping]
  );

  // Throttled function to mark thread as read (prevent database hammering)
  const markAsReadRef = useRef<() => Promise<void>>();
  
  useEffect(() => {
    if (!threadId || !selfId) return;
    
    markAsReadRef.current = throttle(async () => {
      try {
        const { error } = await supabase.rpc('update_last_read_at', {
          thread_id_param: threadId,
          user_id_param: selfId
        });
        
        if (error) {
          console.error('RPC error marking as read:', error);
          // Continue gracefully - don't block messaging
          return;
        }
        
        // Invalidate unread counts query
        qc.invalidateQueries({ queryKey: ['dm-unread', selfId] });
      } catch (error) {
        console.error('Exception marking as read:', error);
        // Continue gracefully - don't block messaging
      }
    }, 1000, { leading: true, trailing: false }); // Only fire once per second max
  }, [threadId, selfId, qc]);

  const markAsRead = useCallback(async () => {
    if (markAsReadRef.current) {
      await markAsReadRef.current();
    }
  }, []);

  return {
    threadId,
    messages,
    isTyping,
    isSending: send.isPending,
    sendMessage: send.mutateAsync,
    sendTyping: throttledTyping, // Throttled typing indicator
    markAsRead, // Mark thread as read
  };
}