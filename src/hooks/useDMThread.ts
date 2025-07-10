import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DirectMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  metadata?: any;
}

export function useDMThread(friendId: string | null) {
  const qc = useQueryClient();
  const [selfId, setSelfId] = useState<string | null>(null);

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
      const { data, error } = await supabase.rpc('find_or_create_dm', {
        a: selfId,
        b: friendId,
      });
      if (error) throw error;
      return data as string;
    },
  });

  /* 3️⃣ messages query */
  const { data: messages = [] } = useQuery({
    queryKey: ['dm-msgs', threadId],
    enabled: !!threadId,
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

      const { error } = await supabase.from('direct_messages').insert({
        thread_id: threadId,
        sender_id: selfId,
        content,
      });
      if (error) throw error;
    },
    onMutate: async (content) => {
      if (!threadId || !selfId) return;

      qc.setQueryData<DirectMessage[]>(['dm-msgs', threadId], (old) => [
        ...(old ?? []),
        {
          id: crypto.randomUUID(),
          thread_id: threadId,
          sender_id: selfId,
          content,
          created_at: new Date().toISOString(),
        },
      ]);
    },
    onSettled: () => {
      if (threadId) qc.invalidateQueries({ queryKey: ['dm-msgs', threadId] });
    },
  });

  /* 5️⃣ realtime – LISTEN to `pg_notify` */
  useEffect(() => {
    if (!threadId) return;
    
    const channel = supabase
      .channel(`dm:${threadId}`)
      .on('broadcast', { event: 'message' }, (payload) => {
        const msg = payload.payload as DirectMessage;
        qc.setQueryData<DirectMessage[]>(['dm-msgs', threadId], (old) => {
          if (old?.some((m) => m.id === msg.id)) return old;
          return [...(old ?? []), msg];
        });
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, qc]);

  return {
    threadId,
    messages,
    isSending: send.isPending,
    sendMessage: send.mutateAsync,
  };
}