import React, { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import dayjs from '@/lib/dayjs';
import { useProfile } from '@/hooks/useProfile';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { MessageActionsTrigger, MessageActionsPopout } from '@/components/chat/MessageActions';
import { useDmReactions } from '@/hooks/messaging/useDmReactions';

type Reaction = { emoji: string; count: number; reactors: string[] };

type Msg = {
  id: string;
  thread_id: string;
  profile_id: string;     // sender
  sender_id?: string;     // legacy fallback
  content: string;
  created_at: string;
  reply_to?: string | null;
  reply_to_msg?: {
    id: string | null;
    profile_id: string | null;
    content: string | null;
    created_at: string | null;
  } | null;
  reactions?: Reaction[];
  status?: 'sending' | 'sent' | 'delivered' | 'read';
};

export function MessageBubble({
  message,
  isOwn,
  isConsecutive = false,
  showAvatar = false, // we render avatars outside in list
  onReply,
}: {
  message: Msg;
  isOwn: boolean;
  isConsecutive?: boolean;
  showAvatar?: boolean;
  onReply?: (id: string, preview?: { content?: string; authorId?: string }) => void;
}) {
  const currentUserId = useCurrentUserId();
  const { data: senderProfile } = useProfile(message.profile_id || message.sender_id);
  const { toggle: toggleReaction } = useDmReactions(message.thread_id);

  // Inline actions popout
  const [actionsOpen, setActionsOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const openActions = (btn: HTMLButtonElement) => {
    setAnchorEl(btn);
    setActionsOpen(true);
  };

  const aligned = isOwn ? 'self-end items-end' : 'self-start items-start';

  const timeText = useMemo(
    () => dayjs(message.created_at).format('h:mm A'),
    [message.created_at]
  );

  // Safeguard for text layout (fixes "one letter per line")
  const content = message.content ?? '';
  const replyPreview = message.reply_to_msg?.content ?? '';

  // Helpers
  const handleReact = (emoji: string) => toggleReaction(message.id, emoji);
  const handleReply = () =>
    onReply?.(message.id, { content: message.content, authorId: message.profile_id });

  return (
    <div
      className={cn(
        'group relative flex w-full py-1',
        aligned
      )}
      data-mid={message.id}
    >
      {/* Column wrapper so we can hug reactions to bubble edge */}
      <div className="flex max-w-[72%] flex-col gap-1">
        {/* === Bubble === */}
        <div
          className={cn(
            'relative rounded-2xl px-3 py-2 shadow-sm',
            'break-words whitespace-pre-wrap', // <= important for proper wrapping
            isOwn
              ? 'bg-primary text-primary-foreground rounded-tr-md'
              : 'bg-muted text-foreground rounded-tl-md'
          )}
        >
          {/* Reply snippet INSIDE bubble (IG style) */}
          {message.reply_to && message.reply_to_msg?.id && (
            <button
              type="button"
              className={cn(
                'mb-2 w-full text-left text-xs/5 opacity-80 rounded-md',
                'bg-background/40 border-l-2 pl-2 pr-1 py-1',
                isOwn ? 'border-blue-300' : 'border-foreground/30'
              )}
              onClick={() => {
                const el = document.querySelector(`[data-mid="${message.reply_to_msg?.id}"]`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              title="View replied message"
            >
              <span className="block text-[10px] uppercase tracking-wide opacity-70 mb-0.5">
                Replied to
              </span>
              <span className="line-clamp-2 opacity-90">{replyPreview || '(deleted message)'}</span>
            </button>
          )}

          {/* Content */}
          <div className="text-sm leading-relaxed">{content}</div>

          {/* Inline actions trigger — bottom-inside corner (IG-like) */}
          <div
            className={cn(
              'pointer-events-none absolute -bottom-3',
              isOwn ? 'right-2' : 'left-2'
            )}
          >
            <div className="pointer-events-auto">
              <MessageActionsTrigger onOpen={openActions} />
            </div>
          </div>
        </div>

        {/* Reactions row — hugs bubble edge, aligns by side */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            className={cn(
              'flex gap-1',
              isOwn ? 'justify-end pr-1' : 'justify-start pl-1',
              '-mt-1'
            )}
          >
            {message.reactions.map((r) => {
              const you = r.reactors.includes(currentUserId || '');
              return (
                <button
                  key={r.emoji}
                  onClick={() => handleReact(r.emoji)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-xs',
                    'shadow-sm backdrop-blur',
                    you
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-background/70 border-border/60 hover:bg-background/90'
                  )}
                  title={`${r.count} reaction${r.count === 1 ? '' : 's'}`}
                >
                  <span>{r.emoji}</span>
                  {r.count > 1 && <span className="opacity-70">{r.count}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Timestamp (outside bubble, subtle) */}
        <div className={cn('text-[11px] text-muted-foreground', isOwn ? 'text-right pr-1' : 'text-left pl-1')}>
          {timeText}
        </div>
      </div>

      {/* Popout portal (z-9999) */}
      {actionsOpen && anchorEl && (
        <MessageActionsPopout
          messageId={message.id}
          anchorRef={{ current: anchorEl }}
          onReact={(emoji) => handleReact(emoji)}
          onReply={() => handleReply()}
          onClose={() => setActionsOpen(false)}
        />
      )}
    </div>
  );
}