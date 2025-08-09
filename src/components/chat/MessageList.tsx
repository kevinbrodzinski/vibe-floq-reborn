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

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  threadId,
  onReply,
  className
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Get unified reactions system
  const { byMessage: reactionsMap, toggle: toggleReaction } = threadId ? useDmReactions(threadId) : { byMessage: {}, toggle: () => {} };

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
        const previousMessage = allMessages[index - 1];
        const isConsecutive =
          previousMessage &&
          (previousMessage.profile_id || previousMessage.sender_id) === senderId &&
          dayjs(message.created_at).diff(dayjs(previousMessage.created_at), 'minute') < 5;

        return (
          <MessageRow
            key={message.id}
            message={message}
            isOwn={isOwn}
            isConsecutive={!!isConsecutive}
            currentUserId={currentUserId}
            onReply={onReply}
            reactionsMap={reactionsMap}
            toggleReaction={toggleReaction}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};

const MessageRow: React.FC<{
  message: Message;
  isOwn: boolean;
  isConsecutive: boolean;
  currentUserId: string | null;
  onReply?: (messageId: string, preview?: { content?: string; authorId?: string }) => void;
  reactionsMap: Record<string, Array<{emoji: string; count: number; reactors: string[]}>>;
  toggleReaction: (messageId: string, emoji: string) => void;
}> = ({ message, isOwn, isConsecutive, currentUserId, onReply, reactionsMap, toggleReaction }) => {
  const { data: senderProfile } = useProfile(message.profile_id || message.sender_id);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const openActions = (btn: HTMLButtonElement) => {
    setAnchorEl(btn);
    setActionsOpen(true);
  };

  const handleReact = (emoji: string, messageId: string) => {
    toggleReaction(messageId, emoji);
  };

  const handleReply = (messageId: string) => {
    onReply?.(messageId, { content: message.content ?? '', authorId: message.profile_id });
  };

  // Get reactions for this specific message
  const messageReactions = reactionsMap[message.id] || [];

  // MEDIA message
  if (message.metadata?.media) {
    return (
      <div className={cn('group relative flex w-full py-1', isOwn ? 'justify-end' : 'justify-start')} data-mid={message.id}>
        <div className="flex flex-col max-w-[72%]">
          <MessageBubble
            message={message as any}
            isOwn={isOwn}
            showAvatar={!isOwn}
            isConsecutive={isConsecutive}
            senderProfile={senderProfile}
            reactions={messageReactions}
            onReact={(emoji) => toggleReaction(message.id, emoji)}
          />
          <div className="max-w-[70%] mx-auto">
            <ChatMediaBubble media={message.metadata.media} className="max-w-xs" />
          </div>
        </div>

        <div className="pointer-events-none absolute -top-3 -right-2 z-[10000] hidden group-hover:flex items-center gap-1">
          <div className="pointer-events-auto">
            <MessageActionsTrigger onOpen={openActions} />
          </div>
        </div>

        {actionsOpen && anchorEl && (
          <MessageActionsPopout
            messageId={message.id}
            anchorRef={{ current: anchorEl }}
            onReact={handleReact}
            onReply={handleReply}
            onClose={() => setActionsOpen(false)}
          />
        )}
      </div>
    );
  }

  // Reply-context message (use expanded view)
  if (message.reply_to && message.reply_to_msg && message.reply_to_msg.id) {
    return (
      <div className={cn('group relative flex w-full py-1', isOwn ? 'justify-end' : 'justify-start')} data-mid={message.id}>
        <div className="flex flex-col max-w-[72%]">
          <div className="text-xs rounded-md px-2 py-1 mb-1 border border-border/40 bg-muted/30">
            <div className="opacity-70">Replying to</div>
            <div className="line-clamp-2">{message.reply_to_msg.content ?? '(deleted message)'}</div>
            <button
              className="text-xs opacity-70 hover:opacity-100 underline mt-1"
              onClick={() => {
                const el = document.querySelector(`[data-mid="${message.reply_to_msg?.id}"]`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              View context
            </button>
          </div>

          <MessageBubble
            message={message as any}
            isOwn={isOwn}
            showAvatar={!isOwn}
            isConsecutive={isConsecutive}
            senderProfile={senderProfile}
            reactions={messageReactions}
            onReact={(emoji) => toggleReaction(message.id, emoji)}
          />
        </div>

        <div className="pointer-events-none absolute -top-3 -right-2 z-[10000] hidden group-hover:flex items-center gap-1">
          <div className="pointer-events-auto">
            <MessageActionsTrigger onOpen={openActions} />
          </div>
        </div>

        {actionsOpen && anchorEl && (
          <MessageActionsPopout
            messageId={message.id}
            anchorRef={{ current: anchorEl }}
            onReact={handleReact}
            onReply={handleReply}
            onClose={() => setActionsOpen(false)}
          />
        )}
      </div>
    );
  }

  // Regular message
  return (
    <div
      className={cn(
        'group relative flex w-full py-1',
        isOwn ? 'justify-end' : 'justify-start'
      )}
      data-mid={message.id}
    >
      <div className="flex flex-col max-w-[72%]">
        <MessageBubble
          message={message as any}
          isOwn={isOwn}
          showAvatar={!isOwn}
          isConsecutive={isConsecutive}
          senderProfile={senderProfile}
          reactions={messageReactions}
          onReact={(emoji) => toggleReaction(message.id, emoji)}
        />
      </div>

      <div className="pointer-events-none absolute -top-3 -right-2 z-[10000] hidden group-hover:flex items-center gap-1">
        <div className="pointer-events-auto">
          <MessageActionsTrigger onOpen={openActions} />
        </div>
      </div>

      {actionsOpen && anchorEl && (
        <MessageActionsPopout
          messageId={message.id}
          anchorRef={{ current: anchorEl }}
          onReact={handleReact}
          onReply={handleReply}
          onClose={() => setActionsOpen(false)}
        />
      )}
    </div>
  );
};