import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { MessageBubble } from '@/components/MessageBubble';
import { MessageActionsTrigger, MessageActionsPopout } from './MessageActions';
import { ReplyPreview } from './ReplyPreview';
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
            currentUserId={currentUserId}
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
  currentUserId,
}: {
  message: Message;
  isOwn: boolean;
  isConsecutive: boolean;
  onReply?: (messageId: string, preview?: { content?: string; authorId?: string }) => void;
  onReact: (messageId: string, emoji: string) => void;
  currentUserId: string | null;
}) {
  const { data: senderProfile } = useProfile(message.profile_id || message.sender_id);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const openActions = (btn: HTMLButtonElement) => {
    setAnchorEl(btn);
    setActionsOpen(true);
  };

  const handleReact = (emoji: string) => onReact(message.id, emoji);
  const handleReply = () =>
    onReply?.(message.id, { content: message.content ?? '', authorId: message.profile_id });

  const time = dayjs(message.created_at).format('h:mm A');

  // Reply message case - separate ReplyPreview
  if (message.reply_to && message.reply_to_msg && message.reply_to_msg.id) {
    const align = isOwn ? "right" : "left";
    const scrollToParent = () => {
      const el = document.querySelector(`[data-mid="${message.reply_to_msg?.id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    return (
      <div
        className={cn(
          "group relative flex w-full py-1",
          isOwn ? "justify-end" : "justify-start"
        )}
        data-mid={message.id}
      >
        <div className="flex flex-col max-w-[72%]">
          {/* 🔹 Detached reply preview ABOVE the new bubble */}
          <ReplyPreview
            text={message.reply_to_msg.content ?? ""}
            onClick={scrollToParent}
            align={align}
          />

          {/* The actual message bubble */}
          <div
            className={cn(
              "relative px-3 py-2 rounded-2xl shadow-sm",
              "whitespace-pre-wrap break-words text-sm leading-relaxed",
              isOwn
                ? "bg-primary text-primary-foreground rounded-tr-md"
                : "bg-muted text-foreground rounded-tl-md"
            )}
          >
            {message.content}
          </div>

          {/* 🔹 Reactions under bubble, bottom-left of the bubble */}
          {message.reactions && message.reactions.length > 0 && (
            <div className={cn("mt-1 flex gap-2", isOwn ? "justify-end" : "justify-start")}>
              {message.reactions.map((r) => {
                const isYourReaction = r.reactors.includes(currentUserId || "");
                return (
                  <span
                    key={r.emoji}
                    onClick={() => handleReact(r.emoji)}
                    className={cn(
                      "rounded-full px-2 py-[2px] text-xs",
                      "border transition-colors cursor-pointer",
                      isYourReaction
                        ? "border-primary/50 bg-primary/10 ring-1 ring-primary/20"
                        : "border-border/50 bg-background/40 hover:bg-muted/50"
                    )}
                  >
                    {r.emoji} {r.count > 1 ? r.count : ""}
                  </span>
                );
              })}
            </div>
          )}

          {/* Timestamp */}
          <div
            className={cn(
              'mt-1 text-xs text-muted-foreground',
              isOwn ? 'text-right pr-1' : 'text-left pl-1'
            )}
          >
            {time}
          </div>
        </div>

        {/* Actions button */}
        <div className="pointer-events-none absolute -bottom-8 left-2 z-[10000] hidden group-hover:flex">
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

  // Regular message case
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
        {/* Message bubble */}
        <div
          className={cn(
            "relative px-3 py-2 rounded-2xl shadow-sm",
            "whitespace-pre-wrap break-words text-sm leading-relaxed",
            isOwn
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-muted text-foreground rounded-tl-md"
          )}
        >
          {message.content}
        </div>

        {/* Reactions under bubble, bottom-left */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={cn("mt-1 flex gap-2", isOwn ? "justify-end" : "justify-start")}>
            {message.reactions.map((r) => {
              const isYourReaction = r.reactors.includes(currentUserId || "");
              return (
                <span
                  key={r.emoji}
                  onClick={() => handleReact(r.emoji)}
                  className={cn(
                    "rounded-full px-2 py-[2px] text-xs",
                    "border transition-colors cursor-pointer",
                    isYourReaction
                      ? "border-primary/50 bg-primary/10 ring-1 ring-primary/20"
                      : "border-border/50 bg-background/40 hover:bg-muted/50"
                  )}
                >
                  {r.emoji} {r.count > 1 ? r.count : ""}
                </span>
              );
            })}
          </div>
        )}

        {/* Timestamp */}
        <div
          className={cn(
            'mt-1 text-xs text-muted-foreground',
            isOwn ? 'text-right pr-1' : 'text-left pl-1'
          )}
        >
          {time}
        </div>
      </div>

      {/* Actions button hugging the bubble */}
      <div className="pointer-events-none absolute -bottom-8 left-2 z-[10000] hidden group-hover:flex">
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