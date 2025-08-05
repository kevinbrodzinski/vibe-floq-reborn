import React, { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Waypoint } from 'react-waypoint';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import dayjs from '@/lib/dayjs';
import { ChatMediaBubble } from './ChatMediaBubble';
import { ReplySnippet } from './ReplySnippet';

interface Message {
  id: string;
  content?: string | null;
  metadata?: any;
  reply_to_id?: string | null;
  created_at: string;
  sender_id: string;
  reactions?: Record<string, string[]>;
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
      {allMessages.map((message) => {
        const isOwn = message.sender_id === currentUserId;
        return (
          <div
            key={message.id}
            className={cn(
              "max-w-[70%] p-3 rounded-lg group",
              isOwn
                ? "bg-primary text-primary-foreground ml-auto"
                : "bg-muted"
            )}
            onDoubleClick={() => onReply?.(message.id)}
          >
            {/* Reply context */}
            {message.reply_to_id && (
              <ReplySnippet messageId={message.reply_to_id} />
            )}

            {/* Main content / media */}
            {message.metadata?.media ? (
              <ChatMediaBubble 
                media={message.metadata.media}
                className="max-w-xs"
              />
            ) : (
              <div className="text-sm">{message.content}</div>
            )}

            {/* Reactions */}
            {message.reactions && Object.keys(message.reactions).length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {Object.entries(message.reactions).map(([emoji, arr]) => (
                  <button
                    key={emoji}
                    onClick={() => onReact?.(message.id, emoji)}
                    className={cn(
                      "px-2 py-1 rounded-full text-xs bg-muted hover:bg-muted/80 transition-colors",
                      Array.isArray(arr) && arr.includes(currentUserId || '') ? 'ring-1 ring-primary' : ''
                    )}
                  >
                    {emoji} {Array.isArray(arr) ? arr.length : 0}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-1">
              <div className="text-xs opacity-70">
                {dayjs(message.created_at).format('HH:mm')}
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="p-1 opacity-0 group-hover:opacity-100 transition h-6 w-6 text-xs"
                  onClick={() => onReact?.(message.id, '👍')}
                >
                  👍
                </button>
                <button
                  className="p-1 opacity-0 group-hover:opacity-100 transition h-6 w-6 text-xs"
                  onClick={() => onReply?.(message.id)}
                >
                  ↩️
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};