import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { MessageBubble } from '@/components/MessageBubble';

type Message = {
  id: string;
  thread_id: string;
  content?: string | null;
  metadata?: any;
  reply_to?: string | null;
  reply_to_msg?: {
    id: string | null;
    profile_id: string | null;
    content: string | null;
    created_at: string | null;
  } | null;
  reactions?: Array<{ emoji: string; count: number; reactors: string[] }>;
  created_at: string;
  sender_id?: string;
  profile_id: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
};

export function MessageList({
  messages,
  currentUserId,
  threadId,
  onReply,
  className
}: {
  messages: {
    data?: { pages: Message[][] };
    hasNextPage?: boolean;
    fetchNextPage: () => void;
    isLoading: boolean;
  };
  currentUserId: string | null;
  threadId?: string;
  onReply?: (messageId: string, preview?: { content?: string; authorId?: string }) => void;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // De-dupe & sort (prevents duplicate keys + weird stacking)
  const allMessages = useMemo(() => {
    const seen = new Set<string>();
    const out: Message[] = [];
    for (const page of messages.data?.pages ?? []) {
      for (const m of page ?? []) {
        if (m?.id && !seen.has(m.id)) {
          seen.add(m.id);
          out.push(m);
        }
      }
    }
    out.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return out;
  }, [messages.data]);

  // Auto scroll on new messages
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [allMessages.length]);

  if (messages.isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className={cn('flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 flex flex-col gap-1', className)}
    >
      {allMessages.map((m, i) => {
        const senderId = m.profile_id || m.sender_id;
        const isOwn = senderId === currentUserId;

        const prev = allMessages[i - 1];
        const isSameSender =
          prev && (prev.profile_id || prev.sender_id) === senderId;
        const closeInTime =
          prev && dayjs(m.created_at).diff(dayjs(prev.created_at), 'minute') < 5;
        const isConsecutive = Boolean(isSameSender && closeInTime);

        return (
          <MessageBubble
            key={m.id}
            message={{
              id: m.id,
              thread_id: m.thread_id,
              profile_id: m.profile_id,
              sender_id: m.sender_id,
              content: m.content || '',
              created_at: m.created_at,
              reply_to: m.reply_to,
              reply_to_msg: m.reply_to_msg,
              reactions: m.reactions,
              status: m.status,
            }}
            isOwn={isOwn}
            isConsecutive={isConsecutive}
            onReply={onReply}
          />
        );
      })}
    </div>
  );
}