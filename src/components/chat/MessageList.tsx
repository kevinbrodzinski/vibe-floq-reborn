import React, { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Waypoint } from 'react-waypoint';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import dayjs from '@/lib/dayjs';
import { MessageBubble } from '@/components/MessageBubble';
import { useProfile } from '@/hooks/useProfile';
import { ChatMediaBubble } from './ChatMediaBubble';
import { ReplySnippet } from './ReplySnippet';
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
  } | null; // ✅ Updated to match expanded view format
  reactions?: Array<{
    emoji: string;
    count: number;
    reactors: string[];
  }>; // ✅ Updated to match expanded view format
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
  threadId?: string; // ✅ Add threadId prop
  onReply?: (messageId: string, preview?: {content?: string; authorId?: string}) => void;
  onReact?: (messageId: string, emoji: string) => void;
  className?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  threadId,
  onReply,
  onReact,
  className
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // ✅ Deduplicate messages to prevent duplicate keys and overlapping pages
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
    // Sort just in case pages overlap out of order
    out.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return out;
  }, [messages.data]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (allMessages.length > 0) {
      const id = requestAnimationFrame(() =>
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      );
      return () => cancelAnimationFrame(id);
    }
  }, [allMessages.length]);

  // ✅ Use the reactions hook if we have a threadId
  const { toggle: toggleReaction } = threadId ? useDmReactions(threadId) : { toggle: () => {} };

  if (messages.isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn("flex-1 overflow-y-auto overflow-x-visible p-4 space-y-4", className)}>
      {/* Load more messages */}
      {messages.hasNextPage && (
        <Waypoint onEnter={() => messages.fetchNextPage()}>
          <div className="flex justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </Waypoint>
      )}

      {/* Messages */}
      {allMessages.map((message, index) => {
        const senderId = message.profile_id || message.sender_id;
        const isOwn = senderId === currentUserId;
        const previousMessage = allMessages[index - 1];
        const isConsecutive = previousMessage && 
          (previousMessage.profile_id || previousMessage.sender_id) === senderId &&
          dayjs(message.created_at).diff(dayjs(previousMessage.created_at), 'minute') < 5;

        return (
          <MessageBubbleWrapper 
            key={message.id}
            message={message}
            isOwn={isOwn}
            isConsecutive={isConsecutive}
            senderId={senderId}
            currentUserId={currentUserId}
            toggleReaction={toggleReaction}
            onReply={onReply}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};

// Wrapper component to handle profile loading for MessageBubble
const MessageBubbleWrapper: React.FC<{
  message: Message;
  isOwn: boolean;
  isConsecutive: boolean;
  senderId: string | undefined;
  currentUserId: string | null;
  toggleReaction: (messageId: string, emoji: string) => void;
  onReply?: (messageId: string, preview?: {content?: string; authorId?: string}) => void;
}> = ({ message, isOwn, isConsecutive, senderId, currentUserId, toggleReaction, onReply }) => {
  const { data: senderProfile } = useProfile(senderId);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);

  const openActions = (btn: HTMLButtonElement) => {
    anchorRef.current = btn;
    setAnchorEl(btn);
    setActionsOpen(true);
  };

  const handleReact = (emoji: string, messageId: string) => {
    toggleReaction(messageId, emoji);
  };

  const handleReply = (messageId: string) => {
    onReply?.(messageId, { content: message.content ?? '', authorId: message.profile_id });
  };

  // Handle media messages
  if (message.metadata?.media) {
    return (
      <div className="group relative px-3 py-1" data-mid={message.id}>
        <MessageBubble
          message={message}
          isOwn={isOwn}
          showAvatar={!isOwn}
          isConsecutive={isConsecutive}
          senderProfile={senderProfile}
        />
        <div className="max-w-[70%] mx-auto">
          <ChatMediaBubble 
            media={message.metadata.media}
            className="max-w-xs"
          />
        </div>

        {/* Hover actions trigger */}
        <div className={cn(
          "absolute -top-3",
          isOwn ? "right-1" : "left-1",
          "hidden group-hover:flex"
        )}>
          <MessageActionsTrigger onOpen={openActions} />
        </div>

        {/* Portal popout */}
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

  // Handle reply context
  if (message.reply_to && message.reply_to_msg && message.reply_to_msg.id) {
    return (
      <div className="group relative px-3 py-1" data-mid={message.id}>
        {/* ✅ Inline reply preview using expanded view data */}
        <div className={`max-w-[75%] text-xs rounded-md px-2 py-1 mb-1 border border-border/40 bg-muted/30 ${isOwn ? "ml-auto" : "mr-auto"}`}>
          <div className="opacity-70">Replying to</div>
          <div className="line-clamp-2">
            {message.reply_to_msg.content ?? '(deleted message)'}
          </div>
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
        
        <div className={cn(
          "inline-block max-w-[75%] rounded-2xl px-3 py-2",
          isOwn ? "bg-primary text-primary-foreground ml-auto" : "bg-muted text-foreground mr-auto"
        )}>
          <MessageBubble
            message={message}
            isOwn={isOwn}
            showAvatar={!isOwn}
            isConsecutive={isConsecutive}
            senderProfile={senderProfile}
          />
        </div>

        {/* Current reactions with "your reaction" highlighting */}
        <div className={`mt-1 flex gap-2 items-center ${isOwn ? "justify-end" : "justify-start"}`}>
          {message.reactions?.map(r => {
            const isYourReaction = r.reactors.includes(currentUserId || '');
            return (
              <span
                key={r.emoji}
                className={`text-xs rounded px-1 border transition-colors cursor-pointer hover:bg-muted/50 ${
                  isYourReaction 
                    ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20' 
                    : 'border-border/50 bg-background/40'
                }`}
                title={`${r.count} reaction${r.count === 1 ? '' : 's'}`}
                onClick={() => toggleReaction(message.id, r.emoji)}
              >
                {r.emoji} {r.count}
              </span>
            );
          })}
        </div>

        {/* Hover actions trigger */}
        <div className={cn(
          "absolute -top-3",
          isOwn ? "right-1" : "left-1",
          "hidden group-hover:flex"
        )}>
          <MessageActionsTrigger onOpen={openActions} />
        </div>

        {/* Portal popout */}
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
    <div className="group relative px-3 py-1" data-mid={message.id}>
      <div className={cn(
        "inline-block max-w-[75%] rounded-2xl px-3 py-2",
        isOwn ? "bg-primary text-primary-foreground ml-auto" : "bg-muted text-foreground mr-auto"
      )}>
        <MessageBubble
          message={message}
          isOwn={isOwn}
          showAvatar={!isOwn}
          isConsecutive={isConsecutive}
          senderProfile={senderProfile}
        />
      </div>

      {/* Current reactions with "your reaction" highlighting */}
      <div className={`mt-1 flex gap-2 items-center ${isOwn ? "justify-end" : "justify-start"}`}>
        {message.reactions?.map(r => {
          const isYourReaction = r.reactors.includes(currentUserId || '');
          return (
            <span
              key={r.emoji}
              className={`text-xs rounded px-1 border transition-colors cursor-pointer hover:bg-muted/50 ${
                isYourReaction 
                  ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20' 
                  : 'border-border/50 bg-background/40'
              }`}
              title={`${r.count} reaction${r.count === 1 ? '' : 's'}`}
              onClick={() => toggleReaction(message.id, r.emoji)}
            >
              {r.emoji} {r.count}
            </span>
          );
        })}
      </div>

      {/* Hover actions trigger */}
      <div className={cn(
        "absolute -top-3",
        isOwn ? "right-1" : "left-1",
        "hidden group-hover:flex"
      )}>
        <MessageActionsTrigger onOpen={openActions} />
      </div>

      {/* Portal popout */}
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