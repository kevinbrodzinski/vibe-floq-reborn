import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { MessageBubble } from '@/components/MessageBubble';
import { MessageActionsTrigger, MessageActionsPopout } from './MessageActions';
import { useDmReactions } from '@/hooks/messaging/useDmReactions';

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

  // Reactions (optimistic)
  const { toggle: toggleReaction } = threadId ? useDmReactions(threadId) : { toggle: () => {} };

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
      className={cn('flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-3', className)}
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
          <Row
            key={m.id}
            isOwn={isOwn}
            message={m}
            isConsecutive={isConsecutive}
            onReply={onReply}
            onReact={toggleReaction}
          />
        );
      })}
    </div>
  );
}

function Row({
  message,
  isOwn,
  isConsecutive,
  onReply,
  onReact,
}: {
  message: Message;
  isOwn: boolean;
  isConsecutive: boolean;
  onReply?: (messageId: string, preview?: { content?: string; authorId?: string }) => void;
  onReact: (messageId: string, emoji: string) => void;
}) {
  const { data: senderProfile } = useProfile(message.profile_id || message.sender_id);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const openActions = (btn: HTMLButtonElement) => {
    setAnchor(btn);
    setOpen(true);
  };

  const time = dayjs(message.created_at).format('h:mm A');

  return (
    <div
      className={cn(
        'group relative flex w-full',
        isOwn ? 'justify-end' : 'justify-start',
        isConsecutive ? 'mt-1' : 'mt-4'
      )}
      data-mid={message.id}
    >
      <div className="flex flex-col max-w-[72vw] sm:max-w-[72%]">
        {/* Bubble + reactions anchored */}
        <div className="relative w-fit max-w-full pb-5">
          <MessageBubble
            message={message}
            isOwn={isOwn}
            isConsecutive={isConsecutive}
            senderProfile={senderProfile}
          />

          {/* Reactions: bottom-left of the bubble */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="absolute -bottom-4 left-2 flex items-center gap-1">
              {message.reactions.map((r) => (
                <button
                  key={r.emoji}
                  className={cn(
                    'h-6 rounded-full px-2 text-xs border',
                    'bg-background/70 hover:bg-background/90',
                    'border-border/50'
                  )}
                  onClick={() => onReact(message.id, r.emoji)}
                  title={`${r.count} reaction${r.count === 1 ? '' : 's'}`}
                >
                  <span className="align-middle">{r.emoji}</span>
                  {r.count > 1 && <span className="ml-1 align-middle">{r.count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp (stays tidy) */}
        <div
          className={cn(
            'mt-1 text-xs text-muted-foreground',
            isOwn ? 'text-right pr-1' : 'text-left pl-1'
          )}
        >
          {time}
        </div>
      </div>

      {/* Actions trigger anchored to bubble corner */}
      <div
        className={cn(
          'absolute opacity-0 group-hover:opacity-100 transition-opacity',
          isOwn ? 'right-2 -bottom-3' : 'left-2 -bottom-3'
        )}
        style={{ pointerEvents: 'none' }} // only the button is clickable
      >
        <div style={{ pointerEvents: 'auto' }}>
          <MessageActionsTrigger onOpen={openActions} />
        </div>
      </div>

      {/* Portal popout */}
      {open && anchor && (
        <MessageActionsPopout
          messageId={message.id}
          anchorRef={{ current: anchor }}
          onReact={(emoji) => onReact(message.id, emoji)}
          onReply={(id) =>
            onReply?.(id, { content: message.content ?? '', authorId: message.profile_id })
          }
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}