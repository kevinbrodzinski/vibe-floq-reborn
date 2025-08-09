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
import { MessageActions } from './MessageActions';
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
          <div className={`group mt-1 flex gap-2 items-center ${isOwn ? "justify-end mr-4" : "ml-4"}`}>
            {/* Reaction picker (hidden until hover) */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MessageActions 
                onReply={() => onReply?.(message.id, { content: message.content ?? '', authorId: message.profile_id })} 
                onReact={(emoji) => toggleReaction(message.id, emoji)} 
              />
            </div>

            {/* Current reactions with "your reaction" highlighting */}
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
      <div className={`group mt-1 flex gap-2 items-center ${isOwn ? "justify-end mr-4" : "ml-4"}`}>
        {/* Reaction picker (hidden until hover) */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MessageActions 
            onReply={() => onReply?.(message.id, { content: message.content ?? '', authorId: message.profile_id })} 
            onReact={(emoji) => toggleReaction(message.id, emoji)} 
          />
        </div>

        {/* Current reactions with "your reaction" highlighting */}
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
    </div>
  );
};