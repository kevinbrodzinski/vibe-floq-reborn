import React, { useEffect, useRef, useState } from 'react';
import { Waypoint } from 'react-waypoint';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import dayjs from '@/lib/dayjs';
import { MessageBubble } from '@/components/MessageBubble';
import { useProfile } from '@/hooks/useProfile';
import { ChatMediaBubble } from './ChatMediaBubble';
import { MessageActionsTrigger, MessageActionsPopout } from './MessageActions';
import { useDmReactions } from '@/hooks/messaging/useDmReactions';

interface Message {
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
}

interface MessageListProps {
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
}

const EMOJIS = ['👍','❤️','😂','🔥','😮','😢'];

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  threadId,
  onReply,
  className
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Get unified reactions system - ONLY source of truth
  const { byMessage, toggle: toggleReaction } = threadId ? useDmReactions(threadId) : { byMessage: {}, toggle: () => {} };

  // dedupe + sort
  const allMessages = React.useMemo(() => {
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

  useEffect(() => {
    if (allMessages.length > 0) {
      const id = requestAnimationFrame(() =>
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      );
      return () => cancelAnimationFrame(id);
    }
  }, [allMessages.length]);

  if (messages.isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn('flex-1 overflow-y-auto overflow-x-visible p-4 space-y-4', className)}>
      {messages.hasNextPage && (
        <Waypoint onEnter={() => messages.fetchNextPage()}>
          <div className="flex justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </Waypoint>
      )}

      {allMessages.map((message, index) => {
        const senderId = message.profile_id || message.sender_id;
        const isOwn = senderId === currentUserId;
        const reactions = byMessage[message.id] || [];

        return (
          <MessageRow
            key={message.id}
            message={message}
            isOwn={isOwn}
            reactions={reactions}
            onReact={(emoji) => toggleReaction(message.id, emoji)}
            onReply={() => onReply?.(message.id, { content: message.content ?? '', authorId: message.profile_id })}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};

function MessageRow({
  message, isOwn, reactions, onReact, onReply
}: {
  message: any;
  isOwn: boolean;
  reactions: Array<{emoji:string; count:number; reactors:string[]}>;
  onReact: (emoji: string) => void;
  onReply: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const openActions = (btn: HTMLButtonElement) => {
    setAnchorEl(btn);
    setOpen(true);
  };

  return (
    <div
      className={cn(
        'group flex w-full py-1',
        isOwn ? 'justify-end' : 'justify-start'
      )}
      data-mid={message.id}
    >
      {/* Bubble container that we can position against */}
      <div className="relative inline-flex max-w-[72%] flex-col">
        <MessageBubble
          content={message.content}
          isOwn={isOwn}
          reply_to_id={message.reply_to}
          created_at={message.created_at}
          reactions={reactions}
          onReact={onReact}
          onReply={onReply}
        />

        {/* 👉 NEW: trigger anchored to the bubble */}
        <div
          className={cn(
            'absolute z-[10000] opacity-0 group-hover:opacity-100 transition-opacity',
            '-bottom-2',             // bump slightly below bubble
            isOwn ? 'right-2' : 'left-2'
          )}
        >
          <MessageActionsTrigger onOpen={openActions} className="h-7 w-7" />
        </div>
      </div>

      {/* 👉 Popout stays as-is */}
      {open && anchorEl && (
        <MessageActionsPopout
          messageId={message.id}
          anchorRef={{ current: anchorEl }}
          onReact={(emoji) => { onReact(emoji); }}
          onReply={() => { onReply(); }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}