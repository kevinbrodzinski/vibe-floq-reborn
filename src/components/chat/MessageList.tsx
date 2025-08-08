import React, { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Waypoint } from 'react-waypoint';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import dayjs from '@/lib/dayjs';
import { MessageBubble } from '@/components/MessageBubble';
import { useProfile } from '@/hooks/useProfile';
import { ChatMediaBubble } from './ChatMediaBubble';
import { ReplySnippet } from './ReplySnippet';

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
  onReply?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  className?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onReply,
  onReact,
  className
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const allMessages = messages.data?.pages?.flatMap(p => p) ?? [];

  // Auto-scroll to bottom when messages change
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
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn("flex-1 overflow-y-auto p-4 space-y-4", className)}>
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
            onReact={onReact}
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
  onReact?: (messageId: string, emoji: string) => void;
}> = ({ message, isOwn, isConsecutive, senderId, onReact }) => {
  const { data: senderProfile } = useProfile(senderId);

  // Handle media messages
  if (message.metadata?.media) {
    return (
      <div className="flex flex-col gap-2">
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
      </div>
    );
  }

  // Handle reply context
  if (message.reply_to && message.reply_to_msg && message.reply_to_msg.id) {
    return (
      <div className="flex flex-col gap-2">
        {/* ✅ Inline reply preview using expanded view data */}
        <div className="mb-1 rounded border border-border/50 bg-muted/30 px-2 py-1 text-xs">
          <div className="opacity-70">Replying to</div>
          <div className="line-clamp-2">
            {message.reply_to_msg.content ?? '(deleted message)'}
          </div>
        </div>
        <div className="flex flex-col">
          <MessageBubble
            message={message}
            isOwn={isOwn}
            showAvatar={!isOwn}
            isConsecutive={isConsecutive}
            senderProfile={senderProfile}
          />
          {/* Render reactions */}
          <div className={`mt-1 flex gap-2 items-center ${isOwn ? "justify-end mr-4" : "ml-4"}`}>
            {message.reactions?.map(r => (
              <span key={r.emoji} className="text-xs rounded px-1 border border-border/50 bg-background">
                {r.emoji} {r.count}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Regular message
  return (
    <div className="flex flex-col">
      <MessageBubble
        message={message}
        isOwn={isOwn}
        showAvatar={!isOwn}
        isConsecutive={isConsecutive}
        senderProfile={senderProfile}
      />
      {/* Reaction controls and display */}
      <div className={`mt-1 flex gap-2 items-center ${isOwn ? "justify-end mr-4" : "ml-4"}`}>
        {/* Quick reaction buttons */}
        <button
          className="text-xs opacity-70 hover:opacity-100 transition-opacity"
          onClick={() => onReact?.(message.id, '👍')}
          title="Like"
        >
          👍
        </button>
        <button
          className="text-xs opacity-70 hover:opacity-100 transition-opacity"
          onClick={() => onReact?.(message.id, '❤️')}
          title="Love"
        >
          ❤️
        </button>

        {/* Current reactions */}
        {message.reactions?.map(r => (
          <span key={r.emoji} className="text-xs rounded px-1 border border-border/50 bg-background">
            {r.emoji} {r.count}
          </span>
        ))}
      </div>
    </div>
  );
};