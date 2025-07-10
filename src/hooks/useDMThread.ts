import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

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

  // Get or create thread
  const { data: resolvedThreadId, isLoading: isCreatingThread } = useQuery({
    queryKey: ['dm-thread', friendId],
    queryFn: async () => {
      if (!friendId) return null;
      const { data, error } = await supabase.rpc('find_or_create_dm', {
        a: (await supabase.auth.getUser()).data.user?.id!,
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
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          thread_id: threadId,
          sender_id: user.data.user.id,
          content
        });
      if (error) throw error;
    },
    onMutate: async (content) => {
      if (!threadId) return;
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      // Optimistic update
      const optimisticMessage: DirectMessage = {
        id: crypto.randomUUID(),
        thread_id: threadId,
        sender_id: user.data.user.id,
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