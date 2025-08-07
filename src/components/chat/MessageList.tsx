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
  reply_to_id?: string | null;
  created_at: string;
  sender_id?: string;
  profile_id: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
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
}> = ({ message, isOwn, isConsecutive, senderId }) => {
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
  if (message.reply_to_id) {
    return (
      <div className="flex flex-col gap-2">
        <ReplySnippet messageId={message.reply_to_id} />
        <MessageBubble
          message={message}
          isOwn={isOwn}
          showAvatar={!isOwn}
          isConsecutive={isConsecutive}
          senderProfile={senderProfile}
        />
      </div>
    );
  }

  // Regular message
  return (
    <MessageBubble
      message={message}
      isOwn={isOwn}
      showAvatar={!isOwn}
      isConsecutive={isConsecutive}
      senderProfile={senderProfile}
    />
  );
};