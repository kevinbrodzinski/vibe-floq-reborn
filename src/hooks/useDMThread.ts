/* src/hooks/useDMThread.ts ****************************************/
import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  useMutation, useQuery, useQueryClient,
} from '@tanstack/react-query';
import throttle from 'lodash.throttle';
import { v4 as uuid } from 'uuid';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { uploadDmMedia } from '@/utils/uploadDmMedia';     // <–– you created this
import { getEnvironmentConfig, isDemo } from '@/lib/environment';

/* ───────── types ───────── */
export interface DirectMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  reply_to_id: string | null;
  created_at: string;
  emoji_only: boolean;
  isOptimistic?: boolean;
}

/* ───────── hook ───────── */
export function useDMThread(friendId: string | null) {
  const qc = useQueryClient();
  const { user } = useAuth();                       // current signed-in user
  const selfId = user?.id ?? null;

  /* 1️⃣  create / fetch thread_id … */
  const { data: threadId } = useQuery({
    queryKey: ['dm-thread', friendId, selfId],
    enabled: !!friendId && !!selfId,
    queryFn: async () => {
      const env = getEnvironmentConfig();
      if (env.presenceMode === 'offline') {
        return `offline-thread-${selfId}-${friendId}`;
      }
      const { data, error } = await supabase.rpc('find_or_create_dm', {
        a: selfId,
        b: friendId,
        p_use_demo: isDemo(),
      });
      if (error) throw error;
      return data as string;
    },
    staleTime: 0,
  });

  /* 2️⃣  real-time subscription (DB changes for messages, broadcast for typing) */
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!threadId) return undefined;

    const channel = supabase.channel(`dm:${threadId}`);

    /* postgres_changes – new / edited / deleted messages */
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `thread_id=eq.${threadId}` },
      ({ new: row }) => {
        qc.setQueryData<DirectMessage[]>(['dm-messages', threadId], (old = []) => {
          if (old.find((m) => m.id === row.id)) return old;          // already present
          return [...old, row as DirectMessage];
        });
      },
    );

    /* broadcast – typing indicator */
    channel.on(
      'broadcast',
      { event: 'typing' },
      ({ payload }) => {
        if (payload.user_id === selfId) return;
        setIsTyping(true);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setIsTyping(false), 3_000);
      },
    );

    channel.subscribe();
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      supabase.removeChannel(channel);
      setIsTyping(false);
    };
  }, [threadId, selfId, qc]);

  /* 3️⃣  fetch last 50 messages */
  const { data: messages = [] } = useQuery({
    queryKey: ['dm-messages', threadId],
    enabled: !!threadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('thread_id', threadId!)
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as DirectMessage[];
    },
    staleTime: 10_000,
  });

  /* 4️⃣  send message (with optional file / emojiOnly / reply_to) */
  const sendMessage = useMutation({
    mutationFn: async (p: {
      content?: string;
      file?: File;
      reply_to?: string;
      emojiOnly?: boolean;
    }) => {
      if (!threadId || !selfId) throw new Error('not-ready');

      const imageUrl = p.file ? await uploadDmMedia(p.file) : null;

      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          thread_id: threadId,
          sender_id: selfId,
          profile_id: selfId,  // Required field
          content: p.emojiOnly ? null : p.content ?? null,
          metadata: {
            image_url: imageUrl,
            emoji_only: !!p.emojiOnly,
          },
          reply_to_id: p.reply_to ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as DirectMessage;
    },
    onMutate: async (p) => {
      if (!threadId || !selfId) return undefined;

      const optimistic: DirectMessage = {
        id: `tmp-${uuid()}`,
        thread_id: threadId,
        sender_id: selfId,
        content: p.emojiOnly ? null : p.content ?? null,
        image_url: p.file ? URL.createObjectURL(p.file) : null,
        reply_to_id: p.reply_to ?? null,
        created_at: new Date().toISOString(),
        emoji_only: !!p.emojiOnly,
        isOptimistic: true,
      };

      qc.setQueryData<DirectMessage[]>(['dm-messages', threadId], (old = []) => [...old, optimistic]);
      return { optimisticId: optimistic.id };
    },
    onSuccess: (real, _vars, ctx) => {
      if (!ctx?.optimisticId || !threadId) return;
      qc.setQueryData<DirectMessage[]>(['dm-messages', threadId], (old = []) =>
        old.map((m) => (m.id === ctx.optimisticId ? real as DirectMessage : m)),
      );
    },
    onError: (_e, _vars, ctx) => {
      if (!ctx?.optimisticId || !threadId) return;
      qc.setQueryData<DirectMessage[]>(['dm-messages', threadId], (old = []) =>
        old.filter((m) => m.id !== ctx.optimisticId),
      );
    },
  });

  /* 5️⃣  typing indicator (throttled) */
  const sendTyping = useCallback(
    throttle(() => {
      if (!threadId || !selfId) return;
      supabase.channel(`dm:${threadId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { profile_id: selfId },
      });
    }, 2_000, { trailing: false }),
    [threadId, selfId],
  );

  /* 6️⃣  mark thread as read */
  const markReadThrottled = useRef(
    throttle(async () => {
      if (!threadId || !selfId) return;
      await supabase.rpc('update_last_read_at', {
        thread_id_param: threadId,
        user_id_param: selfId,
      });
    }, 1_000, { trailing: false }),
  );

  const markAsRead = useCallback(async () => markReadThrottled.current(), []);

  return {
    threadId,
    messages,
    isTyping,
    isSending: sendMessage.isPending,
    sendMessage: sendMessage.mutateAsync,
    sendTyping,
    markAsRead,
  };
}