import * as React from 'react';
import { cn } from '@/lib/utils';
import { setRallyLastSeen } from '@/lib/api/rallyRead';
import { formatDistanceToNow } from 'date-fns';

type Message = {
  id: string;
  thread_id: string;
  created_at: string;
  kind: 'system' | 'invite' | 'text';
  author_profile?: string | null;
  body: string;
};

type Props = {
  rallyId: string;
  threadId: string;
  messages: Message[];
  firstUnreadAt?: string | null;
  className?: string;
};

export function RallyThreadView({
  rallyId,
  threadId,
  messages,
  firstUnreadAt,
  className,
}: Props) {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [jumped, setJumped] = React.useState(false);

  const firstUnreadIndex = React.useMemo(() => {
    if (!firstUnreadAt) return -1;
    const ts = new Date(firstUnreadAt).getTime();
    return messages.findIndex((m) => new Date(m.created_at).getTime() >= ts);
  }, [messages, firstUnreadAt]);

  const canJump = firstUnreadIndex >= 0 && messages.length > firstUnreadIndex;

  const jumpToFirstUnread = React.useCallback(() => {
    if (!canJump || !listRef.current) return;
    const target = listRef.current.querySelector<HTMLElement>(
      `[data-message-ts="${messages[firstUnreadIndex].created_at}"]`,
    );
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target.focus({ preventScroll: true });
      setJumped(true);
    }
  }, [canJump, messages, firstUnreadIndex]);

  React.useEffect(() => {
    if (canJump && !jumped) {
      const id = window.setTimeout(jumpToFirstUnread, 120);
      return () => clearTimeout(id);
    }
  }, [canJump, jumped, jumpToFirstUnread]);

  React.useEffect(() => {
    setRallyLastSeen(rallyId).catch(() => {});
  }, [rallyId, threadId]);

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="text-sm text-muted-foreground">{messages.length} messages</div>
        {canJump && (
          <button
            type="button"
            onClick={jumpToFirstUnread}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label="Jump to first unread message"
          >
            Jump to first unread
          </button>
        )}
      </div>
      <div ref={listRef} className="relative flex-1 overflow-y-auto px-3 py-2">
        {messages.map((m) => (
          <div
            key={m.id}
            data-message-ts={m.created_at}
            className={cn(
              'mb-2 rounded-lg border px-3 py-2',
              m.kind === 'system' ? 'bg-muted/40 text-muted-foreground' : 'bg-card text-foreground',
            )}
          >
            <div className="mb-1 text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
            </div>
            <div className="text-sm">{m.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}