import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useMemo } from 'react';

interface DirectMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  metadata?: any;
}

export function useDMThread(friendId: string | null) {
  const queryClient = useQueryClient();
  const [threadId, setThreadId] = useState<string | null>(null);

  // Cache current user ID to avoid hook-order violations
  const currentUserId = useMemo(async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || null;
  }, []);

  // Get or create thread
  const { data: resolvedThreadId, isLoading: isCreatingThread } = useQuery({
    queryKey: ['dm-thread', friendId],
    queryFn: async () => {
      if (!friendId) return null;
      const userId = await currentUserId;
      if (!userId) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.rpc('find_or_create_dm', {
        a: userId,
        b: friendId
      });
      if (error) throw error;
      return data as string;
    },
    enabled: !!friendId,
  });

  useEffect(() => {
    if (resolvedThreadId) {
      setThreadId(resolvedThreadId);
    }
  }, [resolvedThreadId]);

  // Fetch messages
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['dm-messages', threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return data as DirectMessage[];
    },
    enabled: !!threadId,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!threadId) throw new Error('No thread ID');
      const userId = await currentUserId;
      if (!userId) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          thread_id: threadId,
          sender_id: userId,
          content
        });
      if (error) throw error;
    },
    onMutate: async (content) => {
      if (!threadId) return;
      const userId = await currentUserId;
      if (!userId) return;

      // Optimistic update
      const optimisticMessage: DirectMessage = {
        id: crypto.randomUUID(),
        thread_id: threadId,
        sender_id: userId,
        content,
        created_at: new Date().toISOString()
      };

      queryClient.setQueryData<DirectMessage[]>(['dm-messages', threadId], (old) => [
        ...(old ?? []),
        optimisticMessage
      ]);
    },
    onError: () => {
      // Refetch messages on error to remove optimistic update
      queryClient.invalidateQueries({ queryKey: ['dm-messages', threadId] });
    }
  });

  // Realtime subscription for new messages
  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(`dm:${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `thread_id=eq.${threadId}`
      }, (payload) => {
        const newMessage = payload.new as DirectMessage;
        queryClient.setQueryData<DirectMessage[]>(['dm-messages', threadId], (old) => {
          const existing = old?.find(m => m.id === newMessage.id);
          if (existing) return old;
          return [...(old ?? []), newMessage];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, queryClient]);

  return {
    threadId,
    messages,
    isLoading: isCreatingThread || isLoadingMessages,
    sendMessage: sendMessage.mutateAsync,
    isSending: sendMessage.isPending
  };
}